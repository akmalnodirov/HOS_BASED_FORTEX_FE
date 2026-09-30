import { ref, computed } from 'vue'
import { useApi } from '@/composables/useAxiosService'
import { toast } from 'vue-sonner'
import { ApiEndpoints } from '@/api/endpoints'
import { getCarrierId } from '@/utils/carrier'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import type {
  Company,
  CompanyFormData,
  Terminal,
  TerminalFormData,
  CarrierApiResponse,
  CarrierRequest,
  CarrierTerminalRequest,
  DriverLogSettingsRequest,
} from '@/modules/Company/types'

interface IssuerStateParent {
  id: string
  name: string
  parentId: null | string
  stateCode: string
}

interface IssuerState {
  id: string
  name: string
  parentId: string
  stateCode: string
}

interface TimeZoneOption {
  id: string
  offset: number
  displayName: string
  daylightName: string
  shortName: string
  ianaId: string
}

interface NamedOption {
  id: string
  name: string
}

export function useCompany() {
  const api = useApi()
  const authStore = useAuthStore()

  // State
  const company = ref<Company>({
    id: '',
    carrierId: '',
    carrierName: '',
    dotNumber: '',
    timeZone: '',
    timeZoneId: '',
    phoneNumber: '',
    email: '',
    address: '',
    address2: '',
    country: '',
    countryId: '',
    state: '',
    stateId: '',
    cityCode: '',
    zipCode: '',
    exemptDriver: false,
    periodStartingTime: '00:00',
    hosRoles: '',
    hosRuleId: '',
    cargoType: '',
    cargoTypeId: '',
    restart: '',
    restartId: '',
    restBreak: '',
    restBreakId: '',
    shortHaulException: false,
    allowPersonalUse: false,
    allowYardMoves: false,
    unlimitedShippingDocs: false,
    unlimitedTrailer: false,
    isAllowedSleep: true,
    allowTracking: false,
    allowIFTA: false,
    providerId: '',
    terminals: [],
  })

  const isLoading = ref(false)
  const isSaving = ref(false)

  // Issuer state data
  const issuerStateParents = ref<IssuerStateParent[]>([])
  const issuerStates = ref<IssuerState[]>([])
  const isLoadingParents = ref(false)
  const isLoadingStates = ref(false)

  // Config options from API
  const timeZones = ref<TimeZoneOption[]>([])
  const hosRoles = ref<NamedOption[]>([])
  const cargoTypes = ref<NamedOption[]>([])
  const restarts = ref<NamedOption[]>([])
  const restBreaks = ref<NamedOption[]>([])

  // Selected country/state for filtering
  const selectedCountryId = ref<string>('')
  const selectedStateId = ref<string>('')

  // Computed: timezone options for dropdown
  const timeZoneOptions = computed(() =>
    timeZones.value.map((tz) => ({
      id: tz.id,
      name: tz.displayName,
      ianaId: tz.ianaId,
    }))
  )

  // Computed: Countries from issuer state parents
  const countryOptions = computed(() =>
    issuerStateParents.value.map((parent) => ({
      id: parent.id,
      name: parent.name,
    }))
  )

  // Computed: Filtered states based on selected country
  const stateOptions = computed(() => {
    if (!selectedCountryId.value) {
      return []
    }
    return issuerStates.value
      .filter((state) => state.parentId === selectedCountryId.value)
      .map((state) => ({
        id: state.id,
        name: state.name,
      }))
  })

  // Computed: HOS roles options for dropdown
  const hosRolesOptions = computed(() => hosRoles.value.map((r) => ({ id: r.id, name: r.name })))

  // Computed: Cargo type options for dropdown
  const cargoTypeOptions = computed(() => cargoTypes.value.map((c) => ({ id: c.id, name: c.name })))

  // Computed: Restart options for dropdown
  const restartOptions = computed(() => restarts.value.map((r) => ({ id: r.id, name: r.name })))

  // Computed: Rest break options for dropdown
  const restBreakOptions = computed(() => restBreaks.value.map((r) => ({ id: r.id, name: r.name })))

  // ============ Fetch Config Data ============

  const fetchIssuerStateParents = async () => {
    isLoadingParents.value = true
    try {
      const response = await api.get<{ successResult: IssuerStateParent[] }>(
        ApiEndpoints.ISSUER_STATE_PARENT_URL
      )
      issuerStateParents.value = response.data?.successResult || []
    } catch (error: any) {
      console.error('Error fetching issuer state parents:', error)
    } finally {
      isLoadingParents.value = false
    }
  }

  const fetchIssuerStates = async () => {
    isLoadingStates.value = true
    try {
      const response = await api.get<{ successResult: { data: IssuerState[] } }>(
        ApiEndpoints.ISSUER_STATE_URL
      )
      issuerStates.value = response.data?.successResult?.data || []
    } catch (error: any) {
      console.error('Error fetching issuer states:', error)
    } finally {
      isLoadingStates.value = false
    }
  }

  const fetchTimeZones = async () => {
    try {
      const response = await api.get<{ successResult: TimeZoneOption[] }>(
        ApiEndpoints.CARRIERS_TIME_ZONES
      )
      timeZones.value = response.data?.successResult || []
    } catch (error: any) {
      console.error('Error fetching time zones:', error)
    }
  }

  const fetchHosRoles = async () => {
    try {
      const response = await api.get<{ successResult: any }>(ApiEndpoints.HOS_RULE_URL)
      const raw = response.data?.successResult
      hosRoles.value = Array.isArray(raw) ? raw : raw?.data || []
    } catch (error: any) {
      console.error('Error fetching HOS roles:', error)
    }
  }

  const fetchCargoTypes = async () => {
    try {
      const response = await api.get<{ successResult: any }>(ApiEndpoints.CARGO_TYPE_URL)
      const raw = response.data?.successResult
      cargoTypes.value = Array.isArray(raw) ? raw : raw?.data || []
    } catch (error: any) {
      console.error('Error fetching cargo types:', error)
    }
  }

  const fetchRestarts = async () => {
    try {
      const response = await api.get<{ successResult: any }>(ApiEndpoints.RESTART_URL)
      const raw = response.data?.successResult
      restarts.value = Array.isArray(raw) ? raw : raw?.data || []
    } catch (error: any) {
      console.error('Error fetching restarts:', error)
    }
  }

  const fetchRestBreaks = async () => {
    try {
      const response = await api.get<{ successResult: any }>(ApiEndpoints.REST_BREAK_URL)
      const raw = response.data?.successResult
      restBreaks.value = Array.isArray(raw) ? raw : raw?.data || []
    } catch (error: any) {
      console.error('Error fetching rest breaks:', error)
    }
  }

  // ============ Map API Response to UI ============

  const mapApiToCompany = (data: CarrierApiResponse): Company => {
    const logSettings = data.carrierDriverLogSetting

    return {
      id: data.id,
      carrierId: data.id,
      carrierName: data.name,
      dotNumber: data.usdotNumber,
      timeZone: data.timeZoneInfo?.displayName || '',
      timeZoneId: data.timeZoneInfo?.id || '',
      phoneNumber: data.phoneNumber || '',
      email: data.email || '',
      address: data.street || '',
      address2: '',
      country: data.issuerState?.name || '',
      countryId: '',
      state: data.issuerState?.name || '',
      stateId: data.issuerState?.id || '',
      cityCode: data.city || '',
      zipCode: data.zipCode || '',
      // Carrier Settings
      exemptDriver: logSettings?.exemptDriver ?? false,
      periodStartingTime: logSettings?.startingTime24HourPeriod || '000000',
      hosRoles: logSettings?.hosRule?.name || '',
      hosRuleId: logSettings?.hosRule?.id || '',
      cargoType: logSettings?.cargoType?.name || '',
      cargoTypeId: logSettings?.cargoType?.id || '',
      restart: logSettings?.restart?.name || '',
      restartId: logSettings?.restart?.id || '',
      restBreak: logSettings?.restBreak?.name || '',
      restBreakId: logSettings?.restBreak?.id || '',
      shortHaulException: logSettings?.shortHaulException ?? false,
      allowPersonalUse: logSettings?.allowPersonalUse ?? false,
      allowYardMoves: logSettings?.allowYardMoves ?? false,
      unlimitedShippingDocs: false,
      unlimitedTrailer: false,
      isAllowedSleep: logSettings?.isAllowedSleep ?? true,
      // Plan Features
      allowTracking: logSettings?.allowTracking ?? false,
      allowIFTA: logSettings?.allowIFTA ?? false,
      // Provider
      providerId: data.provider?.id || '',
      // Terminals
      terminals: (data.carrierTerminals || []).map((terminal, index) => {
        // Find parent country ID from issuer state
        const terminalStateParentId =
          issuerStates.value.find((s) => s.id === terminal.issuerState?.id)?.parentId || ''

        return {
          id: terminal.id,
          name: `Terminal ${index + 1}`,
          timeZone: terminal.timeZoneInfo?.displayName || '',
          timeZoneId: terminal.timeZoneInfo?.id || '',
          address: terminal.street || '',
          country: '',
          countryId: terminalStateParentId,
          state: terminal.issuerState?.name || '',
          stateId: terminal.issuerState?.id || '',
          cityCode: terminal.city || '',
          zipCode: terminal.zipCode || '',
        }
      }),
    }
  }

  // ============ Map UI Form to API Request ============

  const buildCarrierRequest = (formData: CompanyFormData): CarrierRequest => {
    const terminals: CarrierTerminalRequest[] = company.value.terminals.map((t) => ({
      id: t.id || null,
      timeZoneId: t.timeZoneId,
      street: t.address,
      city: t.cityCode,
      zipCode: t.zipCode || '',
      issuerStateId: t.stateId,
    }))

    const logSettings: DriverLogSettingsRequest = {
      exemptDriver: formData.exemptDriver,
      hosRuleId: formData.hosRuleId || null,
      cargoTypeId: formData.cargoTypeId || null,
      restartId: formData.restartId || null,
      restBreakId: formData.restBreakId || null,
      shortHaulException: formData.shortHaulException,
      allowYardMoves: formData.allowYardMoves,
      allowPersonalUse: formData.allowPersonalUse,
      startingTime24HourPeriod: formData.periodStartingTime || '000000',
      allowIFTA: formData.allowIFTA,
      allowTracking: formData.allowTracking,
      isAllowedSleep: formData.isAllowedSleep ?? true,
    }

    return {
      providerId: company.value.providerId || authStore.providerId || '',
      name: formData.carrierName,
      usdotNumber: formData.dotNumber,
      timeZoneId: formData.timeZoneId,
      phoneNumber: formData.phoneNumber || '',
      email: formData.email || '',
      street: formData.address,
      city: formData.cityCode,
      zipCode: formData.zipCode || '',
      issuerStateId: formData.stateId,
      carrierTerminals: terminals,
      carrierDriverLogSetting: logSettings,
    }
  }

  // ============ CRUD Operations ============

  const loadCompany = async (id?: string) => {
    const carrierId = id || getCarrierId()
    if (!carrierId) {
      console.error('No carrier ID available')
      return
    }

    isLoading.value = true
    try {
      const response = await api.get<{ successResult: CarrierApiResponse }>(
        ApiEndpoints.CARRIERS_BY_ID(carrierId)
      )

      if (response.data?.successResult) {
        company.value = mapApiToCompany(response.data.successResult)

        // Resolve country ID from issuerState
        if (company.value.stateId) {
          const stateData = issuerStates.value.find((s) => s.id === company.value.stateId)
          if (stateData) {
            company.value.countryId = stateData.parentId
            selectedCountryId.value = stateData.parentId

            // Find country name
            const countryData = issuerStateParents.value.find((p) => p.id === stateData.parentId)
            if (countryData) {
              company.value.country = countryData.name
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error loading company:', error)
      toast.error('Failed to load company data')
    } finally {
      isLoading.value = false
    }
  }

  const updateCompany = async (formData: CompanyFormData) => {
    isSaving.value = true
    try {
      const request = buildCarrierRequest(formData)
      await api.put(ApiEndpoints.CARRIERS_BY_ID(company.value.carrierId), request)
      await loadCompany(company.value.carrierId)
      toast.success('Company updated successfully')
    } catch (error: any) {
      console.error('Error updating company:', error)
      toast.error('Failed to update company')
      throw error
    } finally {
      isSaving.value = false
    }
  }

  const addTerminal = async (terminalData: TerminalFormData) => {
    const newTerminal: Terminal = {
      id: '',
      ...terminalData,
    }
    company.value.terminals.push(newTerminal)
  }

  const updateTerminal = async (terminalId: string, terminalData: TerminalFormData) => {
    const index = company.value.terminals.findIndex((t) => t.id === terminalId)
    if (index !== -1) {
      company.value.terminals[index] = {
        ...company.value.terminals[index],
        ...terminalData,
      }
      toast.success('Terminal updated')
    }
  }

  const deleteTerminal = async (terminalId: string) => {
    company.value.terminals = company.value.terminals.filter((t) => t.id !== terminalId)
    toast.success('Terminal removed')
  }

  // ============ Initialize ============

  const initializeData = async () => {
    await Promise.allSettled([
      fetchIssuerStateParents(),
      fetchIssuerStates(),
      fetchTimeZones(),
      fetchHosRoles(),
      fetchCargoTypes(),
      fetchRestarts(),
      fetchRestBreaks(),
    ])
  }

  return {
    // State
    company,
    isLoading,
    isSaving,

    // Issuer state data
    issuerStateParents,
    issuerStates,
    isLoadingParents,
    isLoadingStates,
    selectedCountryId,
    selectedStateId,

    // Config options
    timeZoneOptions,
    countryOptions,
    stateOptions,
    hosRolesOptions,
    cargoTypeOptions,
    restartOptions,
    restBreakOptions,

    // Methods
    loadCompany,
    updateCompany,
    addTerminal,
    updateTerminal,
    deleteTerminal,
    fetchIssuerStateParents,
    fetchIssuerStates,
    initializeData,
  }
}
