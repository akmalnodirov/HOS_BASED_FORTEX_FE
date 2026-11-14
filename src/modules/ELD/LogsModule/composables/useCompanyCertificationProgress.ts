import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import type { CompanyCertificationBatch } from '../[Id]/types/companyCertification'

const STORAGE_KEY_PREFIX = 'route-eld:company-certification:active-batches'
const MAX_CONSECUTIVE_POLL_FAILURES = 20
const batches = ref<Record<string, CompanyCertificationBatch>>({})
const trackedIds = new Set<string>()
const pollFailures = new Map<string, number>()
let initialized = false
let pollTimer: ReturnType<typeof setTimeout> | null = null
let activeUserId: string | null = null

function isTerminal(status: string) {
  return ['SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'FAILED'].includes(status)
}

function progressDescription(batch: CompanyCertificationBatch) {
  return `${batch.completedDrivers} of ${batch.totalDrivers} drivers completed`
}

function persistTrackedIds() {
  if (typeof window === 'undefined' || !activeUserId) return
  const storageKey = `${STORAGE_KEY_PREFIX}:${activeUserId}`
  if (trackedIds.size) {
    localStorage.setItem(storageKey, JSON.stringify([...trackedIds]))
  } else {
    localStorage.removeItem(storageKey)
  }
}

function clearTracking(removePersisted: boolean) {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
  for (const id of trackedIds) toast.dismiss(`company-certification:${id}`)
  trackedIds.clear()
  pollFailures.clear()
  batches.value = {}
  if (removePersisted && activeUserId && typeof window !== 'undefined') {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}:${activeUserId}`)
  }
}

function stopTracking(id: string) {
  trackedIds.delete(id)
  pollFailures.delete(id)
  const { [id]: _removed, ...remainingBatches } = batches.value
  batches.value = remainingBatches
  toast.dismiss(`company-certification:${id}`)
}

function loadTrackedIds(userId: string) {
  if (typeof window === 'undefined') return
  const storageKey = `${STORAGE_KEY_PREFIX}:${userId}`
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    if (Array.isArray(stored)) {
      stored.filter((id): id is string => typeof id === 'string').forEach((id) => trackedIds.add(id))
    }
  } catch {
    localStorage.removeItem(storageKey)
  }
}

function switchUser(userId: string | null) {
  if (activeUserId === userId) return
  clearTracking(activeUserId !== null)
  activeUserId = userId
  if (userId) loadTrackedIds(userId)
  schedulePoll(1000)
}

function notify(batch: CompanyCertificationBatch) {
  const id = `company-certification:${batch.id}`
  const description = progressDescription(batch)
  if (!isTerminal(batch.status)) {
    toast.loading(`Certifying drivers for ${batch.companyName}`, {
      id,
      description,
      duration: Number.POSITIVE_INFINITY,
    })
    return
  }

  if (batch.status === 'SUCCEEDED') {
    toast.success(`Certification fix completed for ${batch.companyName}`, { id, description })
  } else if (batch.status === 'PARTIALLY_SUCCEEDED') {
    toast.warning(`Certification fix completed with issues for ${batch.companyName}`, {
      id,
      description,
    })
  } else {
    toast.error(`Certification fix failed for ${batch.companyName}`, {
      id,
      description: batch.error || description,
    })
  }
}

function schedulePoll(delay: number) {
  if (pollTimer || trackedIds.size === 0) return
  pollTimer = setTimeout(() => {
    pollTimer = null
    void poll()
  }, delay)
}

async function poll() {
  const pollingUserId = activeUserId
  if (!pollingUserId || trackedIds.size === 0) return
  if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
    schedulePoll(5000)
    return
  }

  const api = useApi()
  let requestFailed = false
  await Promise.all(
    [...trackedIds].map(async (id) => {
      try {
        const response = await api.get<{ successResult: CompanyCertificationBatch }>(
          ApiEndpoints.ROUTE_ELD_COMPANY_CERTIFICATION_FIX(id),
          { _skipErrorToast: true }
        )
        if (activeUserId !== pollingUserId) return
        const batch = response.data.successResult
        pollFailures.delete(id)
        batches.value = { ...batches.value, [id]: batch }
        notify(batch)
        if (isTerminal(batch.status)) trackedIds.delete(id)
      } catch (error) {
        if (activeUserId !== pollingUserId) return
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status === 400 || status === 403 || status === 404) {
          stopTracking(id)
          return
        }

        // Give up after a bounded number of consecutive failures so a persistently
        // failing poll cannot retry forever behind an indefinite loading toast.
        const failures = (pollFailures.get(id) ?? 0) + 1
        if (failures >= MAX_CONSECUTIVE_POLL_FAILURES) {
          const batch = batches.value[id]
          stopTracking(id)
          toast.error(
            batch
              ? `Lost track of the certification run for ${batch.companyName}`
              : 'Lost track of a company certification run',
            {
              id: `company-certification:${id}`,
              description: 'Open the certification history to check the final result.',
            }
          )
          return
        }

        pollFailures.set(id, failures)
        requestFailed = true
      }
    })
  )

  if (activeUserId !== pollingUserId) return
  persistTrackedIds()
  if (trackedIds.size) schedulePoll(requestFailed ? 5000 : 3000)
}

function initialize() {
  if (initialized) return
  initialized = true
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_PREFIX)
  }
  const authStore = useAuthStore()
  watch(() => authStore.user?.id ?? null, switchUser, { immediate: true })
}

function track(batch: CompanyCertificationBatch) {
  batches.value = { ...batches.value, [batch.id]: batch }
  if (!isTerminal(batch.status)) trackedIds.add(batch.id)
  persistTrackedIds()
  notify(batch)
  schedulePoll(1000)
}

export function useCompanyCertificationProgress() {
  return { batches, initialize, track }
}
