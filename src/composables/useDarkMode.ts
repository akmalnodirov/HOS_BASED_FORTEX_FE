import { ref, watch } from 'vue'

const isDarkMode = ref(false)
const STORAGE_KEY = 'dark-mode'

export function useDarkMode() {
  // Apply dark mode to document
  const applyDarkMode = () => {
    if (isDarkMode.value) {
      document.documentElement.classList.add('dark')
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.setAttribute('data-theme', 'light')
    }
  }

  // Toggle dark mode
  const toggleDarkMode = () => {
    isDarkMode.value = !isDarkMode.value
    localStorage.setItem(STORAGE_KEY, JSON.stringify(isDarkMode.value))
    applyDarkMode()
  }

  // Set dark mode explicitly
  const setDarkMode = (value: boolean) => {
    isDarkMode.value = value
    localStorage.setItem(STORAGE_KEY, JSON.stringify(isDarkMode.value))
    applyDarkMode()
  }

  // Initialize dark mode from localStorage or system preference
  const initDarkMode = () => {
    const savedMode = localStorage.getItem(STORAGE_KEY)
    if (savedMode !== null) {
      isDarkMode.value = JSON.parse(savedMode)
    } else {
      // Check system preference
      isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    applyDarkMode()
  }

  // Watch for changes and apply
  watch(isDarkMode, () => {
    applyDarkMode()
  })

  return {
    isDarkMode,
    toggleDarkMode,
    setDarkMode,
    initDarkMode,
  }
}
