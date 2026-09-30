import { ref, watch, type Ref } from 'vue'

/**
 * Debounce composable for delaying reactive value updates
 * Follows Single Responsibility Principle - handles only debouncing logic
 *
 * @param source - The reactive source to watch
 * @param delay - Debounce delay in milliseconds (default: 300)
 * @param onDebounce - Optional callback to execute after debounce
 * @returns Debounced ref value
 */
export function useDebounce<T>(source: Ref<T>, delay: number = 300, onDebounce?: () => void) {
  const debouncedValue = ref(source.value) as Ref<T>
  let timeout: ReturnType<typeof setTimeout>

  watch(source, () => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      debouncedValue.value = source.value
      onDebounce?.()
    }, delay)
  })

  return debouncedValue
}
