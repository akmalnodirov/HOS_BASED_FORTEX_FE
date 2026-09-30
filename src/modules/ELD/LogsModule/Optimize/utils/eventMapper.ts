import type { BoostEventsResponse, BoostEventResponse } from '../../Boost/types/boost'
import type { OptimizeEventTableRow } from '../types/optimize'
import { RecordOrigin } from '../constants'
import dayjs from 'dayjs'

/**
 * Event Mapper Utility
 * Maps boost events to table rows
 * Following Single Responsibility Principle
 */
export class EventMapper {
  /**
   * Format time using dayjs
   */
  private static formatTime(date: string | Date, format: string): string {
    return dayjs(date).format(format)
  }

  /**
   * Format duration in seconds to human-readable format
   */
  private static formatDuration(seconds: number, short: boolean = false): string {
    if (!seconds || seconds <= 0) return '0m'

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (short) {
      if (hours > 0) return `${hours}h ${minutes}m`
      return `${minutes}m`
    }

    const parts: string[] = []
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`)
    if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`)

    return parts.join(' ') || '0 minutes'
  }

  /**
   * Map boost events response to table rows
   */
  static mapBoostEventsToTableRows(
    boostEvents: BoostEventsResponse[] | null
  ): OptimizeEventTableRow[] {
    if (!boostEvents) return []

    return (
      boostEvents?.flatMap((dailyEvent) =>
        dailyEvent.events?.map((event) => this.mapSingleEventToRow(event))
      ) || []
    )
  }

  /**
   * Map single event to table row
   */
  static mapSingleEventToRow(event: BoostEventResponse): OptimizeEventTableRow {
    const hasErrors = (event.errorTitles?.length ?? 0) > 0
    const hasWarnings = (event.warningTitles?.length ?? 0) > 0
    const useCalculated = event.locationOrigin === 1 || !Number.isInteger(event.locationOrigin)

    return {
      id: event.id,
      count: event.sequenceId,
      est: this.formatTime(event.dateTime, 'MMM D, YYYY hh:mm A'),
      event: { eventType: event.eventType, eventCode: event.eventCode },
      duration: this.formatDuration(event.durationInSeconds, true),
      location: useCalculated
        ? event.calculatedLocation || event.manualLocation || ''
        : event.manualLocation || event.calculatedLocation || '',
      system: RecordOrigin[event.recordOrigin as keyof typeof RecordOrigin]?.shortName || '',
      odometer: event.totalVehicleMiles,
      hours: event.totalEngineHours,
      notes: event.annotation || '',
      recordStatus: event.recordStatus,
      recordOrigin: event.recordOrigin,
      status: event.actionState,
      isDOTInspected: event.isDOTInspected,
      errorTitles: event.errorTitles,
      warningTitles: event.warningTitles,
      class: hasErrors
        ? '!bg-red-0/[.2] hover:!bg-red-0/[.3] dark:!bg-red-0/[.1] dark:hover:!bg-red-0/[.2]'
        : hasWarnings
          ? '!bg-yellow-1/[.2] hover:!bg-yellow-1/[.3] dark:!bg-yellow-1/[.1] dark:hover:!bg-yellow-1/[.2]'
          : '',
    }
  }

  /**
   * Filter events by criteria
   */
  static filterEvents(
    events: OptimizeEventTableRow[],
    filters: {
      hideArchived?: boolean
      searchText?: string
    }
  ): OptimizeEventTableRow[] {
    let filtered = [...events]

    // Filter archived events
    if (filters.hideArchived) {
      filtered = filtered.filter((event) => event.status !== 4)
    }

    // Filter by search text
    if (filters.searchText && filters.searchText.trim()) {
      const searchLower = filters.searchText.toLowerCase()
      filtered = filtered.filter(
        (event) =>
          event.location.toLowerCase().includes(searchLower) ||
          event.notes.toLowerCase().includes(searchLower) ||
          event.system.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }
}
