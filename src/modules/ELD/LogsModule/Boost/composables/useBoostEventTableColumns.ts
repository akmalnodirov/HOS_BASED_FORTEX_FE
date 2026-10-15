import { computed, ref, watch, type Ref } from 'vue'

export type BoostEventTableColumn =
  | 'duration'
  | 'event'
  | 'location'
  | 'system'
  | 'odometer'
  | 'engineHours'
  | 'notes'
  | 'status'
  | 'trailer'
  | 'document'
  | 'change'
  | 'actions'

export interface BoostEventTableColumnOption {
  id: BoostEventTableColumn
  label: string
}

export type BoostEventTableColumnVisibility = Record<BoostEventTableColumn, boolean>

const storageKey = 'vectorium-boost-event-columns-v1'
export const boostEventTableColumnOptions: BoostEventTableColumnOption[] = [
  { id: 'duration', label: 'Duration' },
  { id: 'event', label: 'Event' },
  { id: 'location', label: 'Location' },
  { id: 'system', label: 'System' },
  { id: 'odometer', label: 'Odometer' },
  { id: 'engineHours', label: 'Engine hours' },
  { id: 'notes', label: 'Notes' },
  { id: 'status', label: 'Status' },
  { id: 'trailer', label: 'Trailer' },
  { id: 'document', label: 'Document' },
  { id: 'change', label: 'Change' },
  { id: 'actions', label: 'Actions' },
]

const defaultVisibility = () =>
  Object.fromEntries(boostEventTableColumnOptions.map((option) => [option.id, true])) as BoostEventTableColumnVisibility

export function useBoostEventTableColumns(activeTabId: Ref<string | null>) {
  const visibility = ref(defaultVisibility())

  watch(
    activeTabId,
    (tabId) => {
      const next = defaultVisibility()
      if (tabId && typeof window !== 'undefined') {
        try {
          const cache = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}')
          const saved = cache?.[tabId] ?? {}
          for (const option of boostEventTableColumnOptions)
            if (typeof saved[option.id] === 'boolean') next[option.id] = saved[option.id]
        } catch {
          // Keep the defaults when browser storage is unavailable.
        }
      }
      visibility.value = next
    },
    { immediate: true }
  )

  const visibleCount = computed(
    () => boostEventTableColumnOptions.filter((option) => visibility.value[option.id]).length
  )
  const persist = () => {
    const tabId = activeTabId.value
    if (!tabId || typeof window === 'undefined') return
    try {
      const cache = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}')
      cache[tabId] = { ...visibility.value }
      window.localStorage.setItem(storageKey, JSON.stringify(cache))
    } catch {
      // In-memory preferences still work.
    }
  }
  const setVisible = (column: BoostEventTableColumn, visible: boolean) => {
    visibility.value[column] = visible
    persist()
  }
  const showAll = () => {
    visibility.value = defaultVisibility()
    persist()
  }
  return { visibility, visibleCount, setVisible, showAll }
}
