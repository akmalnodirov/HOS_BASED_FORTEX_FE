<template>
  <div class="min-h-screen space-y-5 bg-background p-4 text-foreground md:p-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">Company</h1>
        <p class="mt-1 text-sm text-muted-foreground">Company information from Route ELD</p>
      </div>
      <Button variant="outline" size="sm" :disabled="loading || !selectedCompanyId" @click="loadCompany">
        <RefreshCw class="mr-2 h-4 w-4" :class="loading && 'animate-spin'" />Refresh
      </Button>
    </div>

    <div v-if="loading && !company" class="rounded-lg border border-border bg-card p-12 text-center text-sm text-muted-foreground">Loading company information…</div>
    <div v-else-if="error" class="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{{ error }}</div>
    <template v-if="company">
      <section class="rounded-lg border border-border bg-card p-5">
        <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide">General information</h2>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div v-for="field in generalFields" :key="field.label" class="min-w-0">
            <div class="mb-1 text-xs text-muted-foreground">{{ field.label }}</div>
            <div class="min-h-10 break-words rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">{{ field.value }}</div>
          </div>
        </div>
      </section>

      <section class="rounded-lg border border-border bg-card p-5">
        <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide">Carrier settings</h2>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div v-for="field in carrierFields" :key="field.label" class="min-w-0">
            <div class="mb-1 text-xs text-muted-foreground">{{ field.label }}</div>
            <div class="min-h-10 break-words rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">{{ field.value }}</div>
          </div>
        </div>
      </section>

      <section v-if="company.profile.terminals.length" class="space-y-3">
        <h2 class="text-sm font-semibold uppercase tracking-wide">Terminals</h2>
        <div v-for="(terminal, index) in company.profile.terminals" :key="terminal.id || index" class="rounded-lg border border-border bg-card p-5">
          <h3 class="mb-4 text-sm font-semibold">Terminal {{ index + 1 }}</h3>
          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div v-for="field in terminalFields(terminal)" :key="field.label">
              <div class="mb-1 text-xs text-muted-foreground">{{ field.label }}</div>
              <div class="min-h-10 break-words rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">{{ field.value }}</div>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { getCompanyId } from '@/utils/company'
import type { RouteEldCompanyProfileResponse, RouteEldCompanyTerminal } from '../types/routeEldCompanyProfile'
import { codeName, cycleRule, hours, minutes } from '../utils/routeEldCarrierSettings'

const api = useApi()
const authStore = useAuthStore()
const selectedCompanyId = computed(() => authStore.companyId || getCompanyId())
const company = ref<RouteEldCompanyProfileResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
let requestVersion = 0

async function loadCompany() {
  const id = selectedCompanyId.value
  const version = ++requestVersion
  company.value = null
  if (!id) {
    error.value = 'Select a company to view its information.'
    return
  }
  loading.value = true
  error.value = null
  try {
    const response = await api.get<{ successResult: RouteEldCompanyProfileResponse }>(ApiEndpoints.ROUTE_ELD_COMPANY_PROFILE(id))
    if (version === requestVersion) company.value = response.data.successResult
  } catch (exception: any) {
    if (version === requestVersion) error.value = exception.response?.data?.message || 'Could not load company information from Route ELD.'
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

watch(selectedCompanyId, () => { void loadCompany() }, { immediate: true })

function display(value: string | null | undefined) { return value?.trim() || '—' }
function flag(value: boolean | null) { return value === null ? '—' : value ? 'Allowed' : 'Forbidden' }
function feature(value: boolean | null) { return value === null ? '—' : value ? 'Enabled' : 'Disabled' }
function address(street: string | null, city: string | null, state: string | null, zip: string | null) {
  return [street, city, state, zip].map((part) => part?.trim()).filter(Boolean).join(', ') || '—'
}
function timeZone(id: string | null) {
  const names: Record<string, string> = { ET: 'Eastern', CT: 'Central', MT: 'Mountain', PT: 'Pacific', AT: 'Atlantic', HT: 'Hawaii' }
  return id ? `${names[id] ? `${names[id]} Time` : id}${names[id] ? ` (${id})` : ''}` : '—'
}
function logStart(offset: number | null) {
  if (offset === null) return '—'
  if (Number.isInteger(offset) && offset >= 0 && offset < 1440)
    return `${String(Math.floor(offset / 60)).padStart(2, '0')}:${String(offset % 60).padStart(2, '0')}`
  return `${offset} minutes`
}

const generalFields = computed(() => {
  const profile = company.value?.profile
  if (!profile) return []
  return [
    { label: 'Vectorium company ID', value: company.value!.id },
    { label: 'Route ELD company ID', value: profile.externalCompanyId },
    { label: 'Company name', value: display(profile.name) },
    { label: 'DOT number', value: display(profile.dotNumber) },
    { label: 'Time zone', value: timeZone(profile.timeZoneId) },
    { label: 'Company address', value: address(profile.street, profile.city, profile.stateCode, profile.zipCode) },
    { label: 'Compliance mode', value: codeName(profile.complianceModeId) },
  ]
})

const carrierFields = computed(() => {
  const profile = company.value?.profile
  if (!profile) return []
  return [
    { label: 'Cycle rule', value: cycleRule(profile.cycleRuleId) },
    { label: 'Cargo type', value: codeName(profile.cargoTypeId) },
    { label: 'Restart', value: hours(profile.restartId) },
    { label: 'Rest break', value: minutes(profile.restBreakId) },
    { label: '16-hour short-haul exception', value: flag(profile.shortHaulExceptionAllowed) },
    { label: 'Personal conveyance', value: flag(profile.personalConveyanceAllowed) },
    { label: 'Yard moves', value: flag(profile.yardMovesAllowed) },
    { label: 'Exempt driver default', value: flag(profile.exemptDriver) },
    { label: 'Tracking', value: feature(profile.allowTracking) },
    { label: 'IFTA', value: feature(profile.allowIFTA) },
  ]
})

function terminalFields(terminal: RouteEldCompanyTerminal) {
  return [
    { label: 'Terminal ID', value: display(terminal.id) },
    { label: 'Address', value: address(terminal.street, terminal.city, terminal.stateCode, terminal.zipCode) },
    { label: 'Time zone', value: timeZone(terminal.timeZoneId) },
    { label: '24-hour period starts', value: logStart(terminal.logStartOffset) },
  ]
}
</script>
