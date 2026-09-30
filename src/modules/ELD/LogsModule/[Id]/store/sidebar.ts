import { defineStore } from 'pinia'
import { ref, onMounted, onUnmounted } from 'vue'

const SIDEBAR_STORAGE_KEY = 'sidebar-open'

export const useSidebarStore = defineStore('sidebar', () => {
  // Read initial state from localStorage (synced with global sidebar)
  const getInitialState = (): 'open' | 'closed' => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY)
      if (saved !== null) {
        return JSON.parse(saved) ? 'open' : 'closed'
      }
    }
    return 'open'
  }

  const sidebar = ref<'open' | 'closed'>(getInitialState())

  const setSidebar = (state: 'open' | 'closed') => {
    sidebar.value = state
  }

  // Sync with localStorage changes (from global sidebar toggle)
  const syncFromStorage = () => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (saved !== null) {
      sidebar.value = JSON.parse(saved) ? 'open' : 'closed'
    }
  }

  // Listen for storage changes (when global sidebar toggles)
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === SIDEBAR_STORAGE_KEY) {
      syncFromStorage()
    }
  }

  // Setup storage listener
  const setupStorageListener = () => {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange)

      // Also poll for changes (storage event doesn't fire in same tab)
      const interval = setInterval(syncFromStorage, 100)

      return () => {
        window.removeEventListener('storage', handleStorageChange)
        clearInterval(interval)
      }
    }
    return () => {}
  }

  return {
    sidebar,
    setSidebar,
    syncFromStorage,
    setupStorageListener,
  }
})
