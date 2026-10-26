import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type { TaskHistoryItem } from '@/modules/Report/types'

export function useGetTaskHistory(taskId: MaybeRefOrGetter<string | undefined>) {
  const api = useApi()
  const data = ref<TaskHistoryItem[]>([])
  const isPending = ref(false)
  watch(() => toValue(taskId), async (id) => {
    data.value = []
    if (!id) return
    isPending.value = true
    try {
      const response = await api.get<{ successResult: TaskHistoryItem[] }>(ApiEndpoints.REPORT_TASK_HISTORY(id))
      data.value = response.data.successResult
    } finally {
      isPending.value = false
    }
  }, { immediate: true })
  return { data, isPending }
}

