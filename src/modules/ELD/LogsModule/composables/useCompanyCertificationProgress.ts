import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import type { CompanyCertificationBatch } from '../[Id]/types/companyCertification'

const STORAGE_KEY = 'route-eld:company-certification:active-batches'
const batches = ref<Record<string, CompanyCertificationBatch>>({})
const trackedIds = new Set<string>()
let initialized = false
let pollTimer: ReturnType<typeof setTimeout> | null = null

function isTerminal(status: string) {
  return ['SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'FAILED'].includes(status)
}

function progressDescription(batch: CompanyCertificationBatch) {
  return `${batch.completedDrivers} of ${batch.totalDrivers} drivers completed`
}

function persistTrackedIds() {
  if (typeof window === 'undefined') return
  if (trackedIds.size) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...trackedIds]))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
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
  if (trackedIds.size === 0) return
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
          { _skipErrorHandling: true }
        )
        const batch = response.data.successResult
        batches.value = { ...batches.value, [id]: batch }
        notify(batch)
        if (isTerminal(batch.status)) trackedIds.delete(id)
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status === 403 || status === 404) {
          trackedIds.delete(id)
          toast.dismiss(`company-certification:${id}`)
        } else {
          requestFailed = true
        }
      }
    })
  )

  persistTrackedIds()
  if (trackedIds.size) schedulePoll(requestFailed ? 5000 : 3000)
}

function initialize() {
  if (initialized) return
  initialized = true
  if (typeof window !== 'undefined') {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
      if (Array.isArray(stored)) {
        stored.filter((id): id is string => typeof id === 'string').forEach((id) => trackedIds.add(id))
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }
  schedulePoll(1000)
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
