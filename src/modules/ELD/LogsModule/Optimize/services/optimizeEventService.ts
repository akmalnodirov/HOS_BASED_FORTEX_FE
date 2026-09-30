import type { Ref } from 'vue'
import { useBoostEventsStore } from '../../Boost/store/boostEvents'
import type { OptimizeEditStatus } from '../types/optimize'
import type { BoostEventActionRequest, BoostEventsDeleteRequest } from '../../Boost/types/boost'

/**
 * Optimize Event Service
 * Handles event operations (CRUD operations on optimize events)
 * Following Single Responsibility Principle
 */
export class OptimizeEventService {
  private static boostEventsStore = useBoostEventsStore()

  /**
   * Open edit modal for an optimize event
   */
  static async openEditOptimizeEvent(
    editStatus: OptimizeEditStatus,
    eventId: string,
    modal: Ref<boolean>
  ): Promise<void> {
    try {
      const event = await this.boostEventsStore.getBoostEvent(eventId)

      if (!event) {
        throw new Error('Event not found')
      }

      // Populate edit status with event data
      editStatus.eventId = event.id
      editStatus.id = event.sequenceId
      editStatus.event = {
        eventCode: event.eventCode,
        eventType: event.eventType,
      }
      editStatus.startDate = event.dateTime as any // Will be converted by useTimezone
      editStatus.origin = event.recordOrigin
      editStatus.vehicleId = event.vehicleId || null
      editStatus.odometer = event.totalVehicleMiles
      editStatus.engine_hours = event.totalEngineHours
      editStatus.location_origin = event.locationOrigin || 1
      editStatus.latitude = event.latitude
      editStatus.longitude = event.longitude
      editStatus.location = event.calculatedLocation || event.manualLocation || ''
      editStatus.location_note = event.manualLocation || ''
      editStatus.notes = event.annotation || ''
      editStatus.trailer = event.trailer
      editStatus.doc = event.doc

      modal.value = true
    } catch (error) {
      console.error('Failed to open edit event:', error)
      throw error
    }
  }

  /**
   * Submit edited optimize event
   */
  static async submitEditOptimizeEvent(
    editStatus: OptimizeEditStatus,
    sessionId: string,
    tabId: string,
    driverId: string
  ): Promise<boolean> {
    try {
      const model = {
        tabId,
        sessionId,
        driverId,
        vehicleId: editStatus.vehicleId!,
        sequenceId: editStatus.id,
        recordStatus: 1,
        recordOrigin: editStatus.origin,
        eventType: editStatus.event.eventType!,
        eventCode: editStatus.event.eventCode!,
        dateTime: editStatus.startDate.toISOString(),
        totalVehicleMiles: editStatus.odometer,
        totalEngineHours: editStatus.engine_hours,
        annotation: editStatus.notes || null,
        certifiedDate: null,
        trailer: editStatus.trailer,
        doc: editStatus.doc,
        locationOrigin: editStatus.location_origin,
        latitude: editStatus.latitude ? Number(editStatus.latitude) : null,
        longitude: editStatus.longitude ? Number(editStatus.longitude) : null,
        calculatedLocation: editStatus.location_origin === 1 ? editStatus.location : null,
        manualLocation: editStatus.location_origin === 2 ? editStatus.location_note : null,
      }

      await this.boostEventsStore.updateBoostEvent(editStatus.eventId, model)
      return true
    } catch (error) {
      console.error('Failed to submit edit event:', error)
      throw error
    }
  }

  /**
   * Copy an optimize event
   */
  static async copyOptimizeEvent(
    eventId: string,
    sessionId: string,
    tabId: string
  ): Promise<boolean> {
    try {
      const model: BoostEventActionRequest = {
        tabId,
        sessionId,
        eventId,
      }
      await this.boostEventsStore.copyBoostEvent(model)
      return true
    } catch (error) {
      console.error('Failed to copy event:', error)
      throw error
    }
  }

  /**
   * Revert an optimize event
   */
  static async revertOptimizeEvent(
    eventId: string,
    sessionId: string,
    tabId: string
  ): Promise<boolean> {
    try {
      const model: BoostEventActionRequest = {
        tabId,
        sessionId,
        eventId,
      }
      await this.boostEventsStore.revertBoostEvent(model)
      return true
    } catch (error) {
      console.error('Failed to revert event:', error)
      throw error
    }
  }

  /**
   * Delete an optimize event
   */
  static async deleteOptimizeEvent(
    eventId: string,
    sessionId: string,
    tabId: string
  ): Promise<boolean> {
    try {
      const model: BoostEventActionRequest = {
        tabId,
        sessionId,
        eventId,
      }
      await this.boostEventsStore.deleteBoostEvent(model)
      return true
    } catch (error) {
      console.error('Failed to delete event:', error)
      throw error
    }
  }

  /**
   * Delete multiple optimize events
   */
  static async multiDeleteOptimizeEvents(
    eventIds: string[],
    sessionId: string,
    tabId: string
  ): Promise<boolean> {
    try {
      const model: BoostEventsDeleteRequest = {
        tabId,
        sessionId,
        eventIds,
      }
      await this.boostEventsStore.multiDeleteBoostEvents(model)
      return true
    } catch (error) {
      console.error('Failed to multi-delete events:', error)
      throw error
    }
  }
}
