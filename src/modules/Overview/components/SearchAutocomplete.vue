<template>
  <div ref="containerRef" class="relative w-full">
    <div class="relative">
      <Input
        ref="inputRef"
        type="text"
        :model-value="modelValue"
        @input="onInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
        :placeholder="props.placeholder"
        autocomplete="off"
        :class="{ 'pr-10': showClearButton }"
      />
      <span
        v-if="loading"
        class="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-label="Loading results"
      ></span>
      <button
        v-if="showClearButton"
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center hover:text-gray-700 dark:hover:text-gray-300"
        @click="clearValue"
        @mousedown.prevent
        aria-label="Clear input"
      >
        <XCircle class="h-4 w-4 text-gray-400" />
      </button>
    </div>
    <Teleport to="body">
      <transition name="fade">
        <div
          v-if="showDropdown"
          :style="dropdownStyle"
          class="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-[99999] max-h-60 overflow-y-auto"
        >
          <div
            v-if="shouldShowHelper"
            class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center"
          >
            <span v-if="modelValue.trim().length < MIN_CHARACTERS">
              Type at least {{ MIN_CHARACTERS }} letters
            </span>
            <span v-else-if="loading">Searching cities…</span>
            <span v-else-if="!options.length">No cities found</span>
          </div>
          <ul v-else role="listbox" :aria-activedescendant="activeOptionId">
            <li
              v-for="(option, index) in options"
              :key="option.id"
              :id="`city-option-${option.id}`"
              class="px-3 py-2 cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              :class="{
                'bg-gray-100 dark:bg-gray-700': highlightedIndex === index,
                'font-semibold': option.id === selectedOptionId,
              }"
              @mousedown.prevent="selectOption(option)"
              @mouseenter="highlightedIndex = index"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <p class="text-sm text-gray-900 dark:text-gray-100">{{ option.label }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ option.meta }}</p>
                </div>
                <span v-if="option.id === selectedOptionId" class="text-xs text-primary font-bold"
                  >✓</span
                >
              </div>
            </li>
          </ul>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { XCircle } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'

const MIN_CHARACTERS = 2
const MAX_RESULTS = 10

export interface CityOption {
  id: number
  label: string
  meta: string
  lat: number
  lng: number
  state?: string
}

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: 'Search city',
  },
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [value: CityOption]
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const inputRef = ref<InstanceType<typeof Input> | null>(null)
const options = ref<CityOption[]>([])
const highlightedIndex = ref<number>(-1)
const loading = ref<boolean>(false)
const isFocused = ref<boolean>(false)
const selectedOptionId = ref<number | null>(null)
const abortController = ref<AbortController | null>(null)

const dropdownStyle = computed(() => {
  if (!containerRef.value) return {}
  const rect = containerRef.value.getBoundingClientRect()
  return {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  }
})

const showDropdown = computed(
  () =>
    isFocused.value &&
    (loading.value || options.value.length > 0 || props.modelValue.trim().length >= MIN_CHARACTERS)
)
const shouldShowHelper = computed(() => options.value.length === 0)
const showClearButton = computed(() => !loading.value && props.modelValue.trim().length > 0)
const activeOptionId = computed(() => {
  if (highlightedIndex.value === -1 || !options.value[highlightedIndex.value]) return undefined
  return `city-option-${options.value[highlightedIndex.value].id}`
})

const fetchCities = async (query: string) => {
  if (query.trim().length < MIN_CHARACTERS) {
    options.value = []
    return
  }

  abortController.value?.abort()
  abortController.value = new AbortController()
  loading.value = true

  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
    url.searchParams.set('name', query)
    url.searchParams.set('count', `${MAX_RESULTS * 3}`)
    url.searchParams.set('language', 'en')
    url.searchParams.set('format', 'json')

    const response = await fetch(url.toString(), {
      signal: abortController.value.signal,
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch cities (${response.status})`)
    }

    const data = await response.json()
    const seen = new Set<string>()

    options.value = ((data?.results as any[]) || [])
      .filter((item) => item?.country_code === 'US')
      .reduce<CityOption[]>((acc, item) => {
        const key = `${item?.name}-${item?.admin1}`
        if (seen.has(key)) return acc
        seen.add(key)

        if (acc.length >= MAX_RESULTS) return acc

        acc.push({
          id: item.id,
          label: `${item.name}, ${item?.admin1 ?? item?.country ?? ''}`.trim(),
          meta: item?.admin2
            ? `${item.admin2}, ${item.country}`
            : (item?.country ?? 'United States'),
          lat: item.latitude,
          lng: item.longitude,
          state: item?.admin1 ?? undefined,
        })

        return acc
      }, [])

    highlightedIndex.value = options.value.length ? 0 : -1
  } catch (error: any) {
    if (error?.name !== 'AbortError') {
      console.error('Failed to search cities:', error)
      options.value = []
    }
  } finally {
    loading.value = false
  }
}

const debouncedFetch = useDebounceFn((value: string) => {
  fetchCities(value)
}, 300)

const onInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
  selectedOptionId.value = null
  highlightedIndex.value = -1
  debouncedFetch(value)
}

const handleFocus = () => {
  isFocused.value = true
  if (props.modelValue.trim().length >= MIN_CHARACTERS && !options.value.length) {
    debouncedFetch(props.modelValue)
  }
}

const handleBlur = () => {
  setTimeout(() => {
    isFocused.value = false
    highlightedIndex.value = -1
  }, 150)
}

const selectOption = (option: CityOption) => {
  selectedOptionId.value = option.id
  emit('update:modelValue', option.label)
  emit('select', option)
  options.value = []
  highlightedIndex.value = -1
  isFocused.value = false
}

const clearValue = () => {
  emit('update:modelValue', '')
  selectedOptionId.value = null
  options.value = []
  highlightedIndex.value = -1
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!showDropdown.value) return
  const hasOptions = options.value.length > 0

  switch (event.key) {
    case 'ArrowDown':
      if (!hasOptions) return
      event.preventDefault()
      highlightedIndex.value = (highlightedIndex.value + 1) % options.value.length
      break
    case 'ArrowUp':
      if (!hasOptions) return
      event.preventDefault()
      highlightedIndex.value =
        highlightedIndex.value <= 0 ? options.value.length - 1 : highlightedIndex.value - 1
      break
    case 'Enter':
      if (hasOptions && highlightedIndex.value >= 0 && options.value[highlightedIndex.value]) {
        event.preventDefault()
        selectOption(options.value[highlightedIndex.value])
      }
      break
    case 'Escape':
      isFocused.value = false
      options.value = []
      highlightedIndex.value = -1
      break
    default:
      break
  }
}

watch(
  () => props.modelValue,
  (value) => {
    if (!value) {
      options.value = []
      selectedOptionId.value = null
    }
  }
)

onBeforeUnmount(() => {
  abortController.value?.abort()
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
