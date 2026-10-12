import { ref } from 'vue'

export type LogEventTableColumn =
  | 'event'
  | 'duration'
  | 'location'
  | 'odometer'
  | 'engineHours'
  | 'recordOrigin'
  | 'recordStatus'
  | 'notes'

export interface LogEventTableColumnOption {
  id: LogEventTableColumn
  label: string
}

export type LogEventTableColumnVisibility = Record<LogEventTableColumn, boolean>

const storageKey = 'hos-eld-log-event-table-columns-v1'

const columnOptions: LogEventTableColumnOption[] = [
  { id: 'event', label: 'Event' },
  { id: 'duration', label: 'Duration' },
  { id: 'location', label: 'Location' },
  { id: 'odometer', label: 'Odometer' },
  { id: 'engineHours', label: 'Engine hours' },
  { id: 'recordOrigin', label: 'Record origin' },
  { id: 'recordStatus', label: 'Record status' },
  { id: 'notes', label: 'Notes' },
]

function defaultVisibility(): LogEventTableColumnVisibility {
  return Object.fromEntries(
    columnOptions.map((option) => [option.id, true])
  ) as LogEventTableColumnVisibility
}

function readVisibility(): LogEventTableColumnVisibility {
  const visibility = defaultVisibility()
  if (typeof window === 'undefined') return visibility

  try {
    const cached = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}')
    if (!cached || typeof cached !== 'object' || Array.isArray(cached)) return visibility

    for (const option of columnOptions) {
      if (typeof cached[option.id] === 'boolean') visibility[option.id] = cached[option.id]
    }
  } catch {
    // Keep the defaults when browser storage is unavailable or contains invalid data.
  }

  return visibility
}

export function useLogEventTableColumns() {
  const visibility = ref<LogEventTableColumnVisibility>(readVisibility())

  function persistVisibility() {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(visibility.value))
    } catch {
      // The in-memory preference remains usable when browser storage is unavailable.
    }
  }

  function setColumnVisible(column: LogEventTableColumn, visible: boolean) {
    visibility.value[column] = visible
    persistVisibility()
  }

  function showAllColumns() {
    visibility.value = defaultVisibility()
    persistVisibility()
  }

  return {
    columnOptions,
    visibility,
    setColumnVisible,
    showAllColumns,
  }
}
