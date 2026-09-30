import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '@/composables/useAxiosService.ts'
import { ApiEndpoints } from '@/api/endpoints.ts'
import { capitalizeKeys } from '@/utils/object.ts'
import dayjs from 'dayjs'
import type {
  DailyFormListResponse,
  EditDriverDailyFormByDateResponse,
  BoostDailyFormRequest,
  BoostDailyFormRevertRequest,
} from '../types/boost.ts'

export const useBoostDailyFormStore = defineStore('boostDailyForm', () => {
  const api = useApi()

  const dailyFormByDate = ref<EditDriverDailyFormByDateResponse | null>(null)
  const dailyFormsMap = ref<Map<string, DailyFormListResponse>>(new Map())

  async function getEditDriverDailyForms(
    model: { tabId: string; sessionId: string },
    signal?: AbortSignal
  ) {
    const res = await api.get<{ successResult: DailyFormListResponse[] }>(
      ApiEndpoints.EDIT_DRIVER_DAILY_FORMS,
      { params: capitalizeKeys(model), signal }
    )
    const forms = res.data?.successResult ?? []
    dailyFormsMap.value = new Map(
      forms.map((f) => [dayjs(f.formDate).format('YYYY-MM-DD'), f])
    )
  }

  async function getEditDriverDailyForm(model: {
    tabId: string
    sessionId: string
    dateTime: string
  }) {
    const response = await api.get<{ successResult: EditDriverDailyFormByDateResponse }>(
      ApiEndpoints.EDIT_DRIVER_DAILY_FORMS_BY_DATE,
      { params: capitalizeKeys(model) }
    )
    if (response.status === 200) {
      dailyFormByDate.value = response.data?.successResult ?? null
    }
  }

  async function addEditDriverDailyForm(model: BoostDailyFormRequest) {
    const response = await api.post(ApiEndpoints.EDIT_DRIVER_DAILY_FORMS, model)
    return response.status === 200
  }

  async function updateEditDriverDailyForm(id: string, model: BoostDailyFormRequest) {
    const response = await api.put(ApiEndpoints.EDIT_DRIVER_DAILY_FORMS_UPDATE(id), model)
    return response.status === 200
  }

  async function revertEditDriverDailyForm(model: BoostDailyFormRevertRequest) {
    const response = await api.put(ApiEndpoints.EDIT_DRIVER_DAILY_FORMS_REVERT, model)
    return response.status === 200
  }

  return {
    dailyFormByDate,
    dailyFormsMap,
    getEditDriverDailyForms,
    getEditDriverDailyForm,
    addEditDriverDailyForm,
    updateEditDriverDailyForm,
    revertEditDriverDailyForm,
  }
})
