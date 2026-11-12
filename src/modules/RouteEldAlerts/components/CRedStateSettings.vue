<template>
  <section class="mb-4 flex-none rounded-lg border border-border bg-card p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-sm font-semibold text-foreground">Red state monitoring</h2>
        <p class="mt-1 text-xs text-muted-foreground">One set of rules for all Route ELD companies.</p>
      </div>
      <Button v-if="canEdit" size="sm" :disabled="saving || loading || !settingsLoaded" @click="save">
        <LoaderCircle v-if="saving" class="mr-2 h-4 w-4 animate-spin" />
        Save settings
      </Button>
    </div>

    <p v-if="loading" class="mt-4 text-sm text-muted-foreground">Loading settings…</p>
    <template v-else>
      <p v-if="error" class="mt-3 text-sm text-destructive" role="alert">{{ error }}</p>

      <div class="mt-4 flex flex-wrap items-start gap-x-6 gap-y-3">
        <div class="flex w-full min-w-0 flex-col gap-1.5 sm:w-96">
          <div class="h-4 text-xs font-medium leading-4 text-foreground">Monitored states</div>
          <div class="flex h-9 items-center gap-3">
            <div class="min-w-0 flex-1 truncate text-xs text-muted-foreground" :title="selectedSummary">
              {{ selectedSummary }}
            </div>
            <Button
              variant="outline"
              size="sm"
              class="h-9 shrink-0"
              :disabled="!settingsLoaded"
              :aria-expanded="showStates"
              aria-controls="red-state-options"
              @click="showStates = !showStates"
            >
              {{ stateCodes.length }} selected
              <ChevronDown class="ml-2 h-4 w-4 transition-transform" :class="showStates && 'rotate-180'" />
            </Button>
          </div>
        </div>
        <div class="flex w-44 shrink-0 flex-col gap-1.5">
          <label for="red-state-distance" class="block h-4 text-xs font-medium leading-4 text-foreground">Alert distance</label>
          <div class="flex h-9 items-center gap-2">
            <Input
              id="red-state-distance"
              v-model.number="proximityMiles"
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              class="h-9 w-28"
              :disabled="!canEdit || !settingsLoaded"
            />
            <span class="text-xs text-muted-foreground">miles</span>
          </div>
        </div>
      </div>

      <div v-if="showStates && settingsLoaded" id="red-state-options" class="mt-4 rounded-md border border-border bg-muted/20 p-3">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div class="relative w-full max-w-64">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input v-model="stateSearch" placeholder="Search states" class="h-9 pl-9" aria-label="Search states" />
          </div>
          <div v-if="canEdit" class="flex items-center gap-2">
            <Button variant="ghost" size="sm" @click="selectAll">Select all</Button>
            <Button variant="ghost" size="sm" :disabled="!stateCodes.length" @click="stateCodes = []">Clear</Button>
          </div>
        </div>

        <div class="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <label
            v-for="state in visibleStates"
            :key="state.code"
            class="flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition-colors"
            :class="stateCodes.includes(state.code)
              ? 'border-primary/40 bg-primary/5 text-foreground'
              : 'border-border bg-card text-muted-foreground hover:bg-muted/50'"
          >
            <input
              type="checkbox"
              class="h-4 w-4 shrink-0 accent-primary"
              :checked="stateCodes.includes(state.code)"
              :disabled="!canEdit"
              @change="toggle(state.code)"
            />
            <span class="min-w-0 truncate" :title="state.name">{{ state.name }}</span>
            <span class="ml-auto text-[10px] text-muted-foreground">{{ state.code }}</span>
          </label>
          <p v-if="!visibleStates.length" class="col-span-full py-3 text-center text-xs text-muted-foreground">No states found.</p>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronDown, LoaderCircle, Search } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getApiErrorMessage, useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import { US_STATES } from '@/modules/WeightStations/usStates'
import type { RedStateSettings } from '../types'

const props = defineProps<{ canEdit: boolean }>()
const api = useApi()
const states = US_STATES.filter((state) => state.code !== 'DC')
const stateCodes = ref<string[]>([])
const proximityMiles = ref(10)
const stateSearch = ref('')
const showStates = ref(false)
const loading = ref(false)
const saving = ref(false)
const settingsLoaded = ref(false)
const error = ref('')

const visibleStates = computed(() => {
  const query = stateSearch.value.trim().toLowerCase()
  return query
    ? states.filter((state) => state.name.toLowerCase().includes(query) || state.code.toLowerCase().includes(query))
    : states
})

const selectedSummary = computed(() => {
  if (!stateCodes.value.length) return 'No states selected. Alerts are off.'
  const names = stateCodes.value
    .map((code) => states.find((state) => state.code === code)?.name ?? code)
  return names.length > 4
    ? `${names.slice(0, 4).join(', ')} +${names.length - 4} more`
    : names.join(', ')
})

async function load() {
  error.value = ''
  settingsLoaded.value = false
  loading.value = true
  try {
    const response = await api.get<RedStateSettings | { successResult: RedStateSettings }>(ApiEndpoints.ROUTE_ELD_RED_STATE_SETTINGS)
    const settings = 'successResult' in response.data ? response.data.successResult : response.data
    stateCodes.value = settings.stateCodes
    proximityMiles.value = settings.proximityMiles
    settingsLoaded.value = true
  } catch (exception) {
    error.value = getApiErrorMessage(exception, 'Could not load red state settings.')
  } finally {
    loading.value = false
  }
}

function toggle(code: string) {
  if (!props.canEdit || !settingsLoaded.value) return
  stateCodes.value = stateCodes.value.includes(code)
    ? stateCodes.value.filter((item) => item !== code)
    : [...stateCodes.value, code]
}

function selectAll() {
  if (!props.canEdit || !settingsLoaded.value) return
  stateCodes.value = states.map((state) => state.code)
}

async function save() {
  if (!props.canEdit || !settingsLoaded.value) return
  if (!Number.isFinite(proximityMiles.value) || proximityMiles.value < 0.1 || proximityMiles.value > 100) {
    error.value = 'Enter an alert distance from 0.1 to 100 miles.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    await api.put(ApiEndpoints.ROUTE_ELD_RED_STATE_SETTINGS, {
      stateCodes: stateCodes.value,
      proximityMiles: proximityMiles.value,
    })
    toast.success('Red state settings saved.')
  } catch (exception) {
    error.value = getApiErrorMessage(exception, 'Could not save red state settings.')
  } finally {
    saving.value = false
  }
}

onMounted(() => { void load() })
</script>
