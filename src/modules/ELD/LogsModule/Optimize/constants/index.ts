/**
 * Record Origin Enum
 * Represents the source of the log record
 */
export const RecordOrigin = {
  1: { shortName: 'Auto', fullName: 'Automatic' },
  2: { shortName: 'Driver', fullName: 'Driver Entry' },
  3: { shortName: 'Edit', fullName: 'Edited' },
  4: { shortName: 'System', fullName: 'System Generated' },
} as const

/**
 * Action States Enum
 * Represents the state of an event action
 */
export const ActionStates = {
  0: { label: 'Pending', color: '#3B82F6' },
  1: { label: 'Added', color: '#10B981' },
  2: { label: 'Updated', color: '#F59E0B' },
  3: { label: 'Deleted', color: '#EF4444' },
  4: { label: 'Archived', color: '#6B7280' },
} as const

/**
 * Event Type Colors
 * Visual representation for different event types
 */
export const EventTypeColors = {
  1: '#10B981', // Off Duty
  2: '#F59E0B', // Sleep Berth
  3: '#3B82F6', // Driving
  4: '#EF4444', // On Duty
} as const

/**
 * Create table columns configuration for optimize events table
 */
export function createOptimizeTableColumns(timeZone?: string) {
  return [
    { key: 'count', label: 'No', class: 'w-16' },
    { key: 'est', label: `Time ${timeZone ? `(${timeZone})` : ''}`, class: 'min-w-48' },
    { key: 'event', label: 'Event', class: 'min-w-52' },
    { key: 'duration', label: 'Duration', class: 'min-w-30' },
    { key: 'location', label: 'Location', class: 'min-w-64' },
    { key: 'system', label: 'System', class: 'min-w-24' },
    { key: 'odometer', label: 'Odometer', class: 'min-w-28' },
    { key: 'hours', label: 'Engine Hours', class: 'min-w-32' },
    { key: 'notes', label: 'Notes', class: 'min-w-32' },
    { key: 'status', label: 'Status', class: 'min-w-28' },
    { key: 'trailer', label: 'Trailer', class: 'min-w-24' },
    { key: 'document', label: 'Document', class: 'min-w-28' },
    { key: 'action', label: 'Actions', class: 'min-w-32' },
  ]
}

/**
 * Create error and warning columns for modal
 */
export function createErrorAndWarningColumns() {
  return [
    { key: 'count', label: 'No' },
    { key: 'event', label: 'Event' },
    { key: 'time', label: 'Time' },
    { key: 'error', label: 'Error / Warning' },
  ]
}

/**
 * Default notes options for quick selection
 */
export const DEFAULT_NOTE_OPTIONS = ['PTI', 'Fuel', 'Pick up', 'Delivery', 'DOT', 'Break'] as const

/**
 * Location origin types
 */
export const LocationOrigin = {
  1: { label: 'Automatic', value: 1 },
  2: { label: 'Manual', value: 2 },
} as const
