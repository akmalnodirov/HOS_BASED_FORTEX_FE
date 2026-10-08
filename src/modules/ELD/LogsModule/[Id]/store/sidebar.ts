import { defineStore } from 'pinia'
import { ref, onMounted, onUnmounted } from 'vue'

const SIDEBAR_STORAGE_KEY = 'sidebar-open'

export const useSidebarStore = defineStore('sidebar', () => {
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

  const syncFromStorage = () => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (saved !== null) {
      sidebar.value = JSON.parse(saved) ? 'open' : 'closed'
    }
  }

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === SIDEBAR_STORAGE_KEY) {
      syncFromStorage()
    }
  }

  const setupStorageListener = () => {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange)

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
