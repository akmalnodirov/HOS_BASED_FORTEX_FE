import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { getCompanyId } from '@/utils/company'
import type { RouteEldCompany } from '@/types/company'
import { useIftaService } from '../services/iftaService'

export function useIftaCompany() {
  const authStore = useAuthStore()
  const service = useIftaService()
  const localCompanyId = ref(getCompanyId() || '')
  const company = ref<RouteEldCompany | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  let controller: AbortController | null = null

  async function resolveCompany() {
    controller?.abort()
    const request = new AbortController()
    controller = request
    company.value = null
    error.value = null
    const selectedId = localCompanyId.value
    if (!selectedId) {
      isLoading.value = false
      error.value = 'No active company. Select a company before using IFTA.'
      return
    }
    isLoading.value = true
    try {
      const companies = await service.getCompanies(request.signal)
      if (request.signal.aborted || getCompanyId() !== selectedId) return
      const selected = companies.find((item) => item.id === selectedId)
      if (!selected?.isActive || !selected.externalCompanyId) {
        error.value = 'The active company is unavailable or has no Route ELD connection.'
        return
      }
      company.value = selected
    } catch {
      if (!request.signal.aborted) error.value = 'Could not load the active company. Please retry.'
    } finally {
      if (controller === request) isLoading.value = false
    }
  }

  function syncCompany() {
    localCompanyId.value = getCompanyId() || ''
  }

  // Company selection is owned by the existing selector, which reloads the app.
  // Storage/focus also handle changes in another tab without using stale auth metadata.
  watch(localCompanyId, resolveCompany)
  watch(() => authStore.companyId, syncCompany)
  onMounted(() => {
    void resolveCompany()
    window.addEventListener('storage', syncCompany)
    window.addEventListener('focus', syncCompany)
  })
  onScopeDispose(() => {
    controller?.abort()
    window.removeEventListener('storage', syncCompany)
    window.removeEventListener('focus', syncCompany)
  })

  return {
    localCompanyId,
    company,
    companyId: computed(() => company.value?.externalCompanyId || ''),
    companyName: computed(() => company.value?.name || ''),
    isLoading,
    error,
    resolveCompany,
  }
}
