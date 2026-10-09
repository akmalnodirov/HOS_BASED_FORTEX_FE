<template>
  <div class="relative isolate w-full" :class="open && 'z-50'">
    <Input
      :model-value="query"
      :placeholder="placeholder"
      autocomplete="off"
      class="h-10 pr-9"
      @update:model-value="handleInput"
      @focus="handleFocus"
      @blur="closeLater"
    />
    <LoaderCircle
      v-if="loading"
      class="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground"
    />
    <MapPin v-else class="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />

    <div
      v-if="open"
      class="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-xl"
    >
      <button
        v-for="suggestion in suggestions"
        :key="`${suggestion.longitude}-${suggestion.latitude}-${suggestion.label}`"
        type="button"
        class="flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-popover-foreground hover:bg-accent"
        @mousedown.prevent="selectSuggestion(suggestion)"
      >
        <MapPin class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span class="leading-5">{{ suggestion.label }}</span>
      </button>
      <div v-if="suggestions.length === 0" class="px-3 py-3 text-sm text-muted-foreground">
        No addresses found
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { LoaderCircle, MapPin } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type { AlprLocation } from '../types'

const props = defineProps<{
  modelValue: string
  placeholder: string
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'select', value: AlprLocation): void
  (event: 'clear'): void
  (event: 'focus'): void
}>()

const api = useApi()
const query = ref(props.modelValue)
const suggestions = ref<AlprLocation[]>([])
const loading = ref(false)
const open = ref(false)
const focused = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let requestVersion = 0
let selectedLabel = props.modelValue

watch(
  () => props.modelValue,
  (value) => {
    if (value !== query.value) {
      selectedLabel = value
      query.value = value
      cancelSearch()
      suggestions.value = []
      open.value = false
    }
  }
)

function handleInput(value: string | number) {
  const nextValue = String(value)
  query.value = nextValue
  const valueChangedSelection = nextValue !== selectedLabel

  cancelSearch()
  suggestions.value = []
  open.value = false

  emit('update:modelValue', nextValue)
  if (valueChangedSelection) emit('clear')

  const trimmed = nextValue.trim()
  if (trimmed.length < 3) return

  debounceTimer = setTimeout(() => search(trimmed), 300)
}

function cancelSearch() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  requestVersion++
  loading.value = false
}

async function search(value: string) {
  const version = ++requestVersion
  loading.value = true
  try {
    const response = await api.get<AlprLocation[]>(ApiEndpoints.ALPR_GEOCODE_SEARCH, {
      params: { q: value },
      _skipErrorHandling: true,
    })
    if (version !== requestVersion || query.value.trim() !== value) return
    suggestions.value = response.data
    open.value = focused.value
  } catch {
    if (version !== requestVersion || query.value.trim() !== value) return
    suggestions.value = []
    open.value = focused.value
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

function selectSuggestion(suggestion: AlprLocation) {
  cancelSearch()
  selectedLabel = suggestion.label
  query.value = suggestion.label
  suggestions.value = []
  open.value = false
  emit('update:modelValue', suggestion.label)
  emit('select', suggestion)
}

function closeLater() {
  focused.value = false
  window.setTimeout(() => {
    open.value = false
  }, 150)
}

function handleFocus() {
  focused.value = true
  open.value = suggestions.value.length > 0 && query.value !== selectedLabel
  emit('focus')
}

onBeforeUnmount(() => {
  cancelSearch()
})
</script>
