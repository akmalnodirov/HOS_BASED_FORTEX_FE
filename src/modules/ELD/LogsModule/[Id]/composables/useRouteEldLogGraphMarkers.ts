import { computed, ref, type Component, type ComputedRef } from 'vue'
import {
  BadgeCheck,
  CircleAlert,
  ClipboardCheck,
  ClipboardX,
  Coffee,
  Fuel,
  KeyRound,
  LogIn,
  LogOut,
  MapPinned,
  PackageCheck,
  PackagePlus,
  Power,
  Scale,
  ShieldAlert,
  Wrench,
} from 'lucide-vue-next'
import type {
  RouteEldCalculatedViolation,
  RouteEldEvent,
  RouteEldEventIssue,
} from '../types/routeEldDetail'

export type RouteEldLogGraphMarkerType =
  | 'CERTIFICATION'
  | 'ENGINE_POWER_UP'
  | 'ENGINE_SHUT_DOWN'
  | 'STATE_CHANGE'
  | 'PICK_UP'
  | 'LOGIN'
  | 'LOGOUT'
  | 'FUEL'
  | 'DELIVERY'
  | 'PTI'
  | 'NO_PTI'
  | 'DOT_INSPECTION'
  | 'REPAIRS'
  | 'BREAK'
  | 'ERROR'
  | 'VIOLATION'

export interface RouteEldLogGraphMarkerOption {
  id: RouteEldLogGraphMarkerType
  label: string
  color: string
  icon: Component
}

interface Dependencies {
  events: ComputedRef<RouteEldEvent[]>
  eventIssues: ComputedRef<RouteEldEventIssue[]>
  violations: ComputedRef<RouteEldCalculatedViolation[]>
  graphWidth: number
  eventX: (event: Pick<RouteEldEvent, 'timestamp'>) => number
  formatEventTime: (event: RouteEldEvent) => string
}

const options: RouteEldLogGraphMarkerOption[] = [
  {
    id: 'CERTIFICATION',
    label: 'Certification',
    color: '#2563EB',
    icon: BadgeCheck,
  },
  {
    id: 'ENGINE_POWER_UP',
    label: 'Engine Power-Up',
    color: '#16A34A',
    icon: KeyRound,
  },
  {
    id: 'ENGINE_SHUT_DOWN',
    label: 'Engine Shut-Down',
    color: '#DC2626',
    icon: Power,
  },
  {
    id: 'STATE_CHANGE',
    label: 'State Change',
    color: '#475569',
    icon: MapPinned,
  },
  { id: 'PICK_UP', label: 'Pick-Up', color: '#7C3AED', icon: PackagePlus },
  { id: 'LOGIN', label: 'Login', color: '#059669', icon: LogIn },
  { id: 'LOGOUT', label: 'Logout', color: '#D97706', icon: LogOut },
  { id: 'FUEL', label: 'Fuel', color: '#CA8A04', icon: Fuel },
  { id: 'DELIVERY', label: 'Delivery', color: '#7C3AED', icon: PackageCheck },
  { id: 'PTI', label: 'PTI', color: '#EA580C', icon: ClipboardCheck },
  { id: 'NO_PTI', label: 'NO PTI', color: '#DC2626', icon: ClipboardX },
  {
    id: 'DOT_INSPECTION',
    label: 'DOT Inspection / Scale',
    color: '#D97706',
    icon: Scale,
  },
  { id: 'REPAIRS', label: 'Repairs', color: '#64748B', icon: Wrench },
  { id: 'BREAK', label: 'Rest / Break', color: '#0891B2', icon: Coffee },
  { id: 'ERROR', label: 'Errors', color: '#DC2626', icon: CircleAlert },
  { id: 'VIOLATION', label: 'Violations', color: '#E11D48', icon: ShieldAlert },
]

export function useRouteEldLogGraphMarkers(dependencies: Dependencies) {
  const { events, eventIssues, violations, graphWidth, eventX, formatEventTime } = dependencies
  const markerSettings = ref<Record<RouteEldLogGraphMarkerType, boolean>>(
    Object.fromEntries(options.map((option) => [option.id, true])) as Record<
      RouteEldLogGraphMarkerType,
      boolean
    >
  )

  const graphMarkers = computed(() => {
    const enabled = options.filter((option) => markerSettings.value[option.id])
    if (!enabled.length) return []

    const errorEventIds = new Set(
      eventIssues.value
        .filter((issue) => issue.severity.toUpperCase() === 'ERROR')
        .map((issue) => issue.eventId)
    )
    const noPtiTimestamps = new Map(
      eventIssues.value
        .filter((issue) => issue.code === 'NO_PTI')
        .map((issue) => [issue.eventId, issue.timestamp])
    )
    const noPtiEventIds = new Set(noPtiTimestamps.keys())
    const violationEventIds = new Set(violations.value.map((violation) => violation.eventId))
    const stateChangeEventIds = new Set<string>()
    let previousState: string | null = null
    for (const event of [...events.value].sort((left, right) => left.timestamp - right.timestamp)) {
      const state = locationState(event.location)
      if (!state) continue
      if (previousState && state !== previousState) stateChangeEventIds.add(event.id)
      previousState = state
    }

    const markers = [...events.value]
      .sort((left, right) => left.timestamp - right.timestamp)
      .flatMap((event) =>
        enabled
          .filter((option) =>
            eventMatchesMarker(
              event,
              option.id,
              errorEventIds,
              noPtiEventIds,
              violationEventIds,
              stateChangeEventIds
            )
          )
          .map((option) => {
            const timestamp =
              option.id === 'NO_PTI'
                ? (noPtiTimestamps.get(event.id) ?? event.timestamp)
                : event.timestamp
            const x = eventX({ timestamp })
            return {
              key: `${event.id}:${option.id}`,
              eventId: event.id,
              event,
              x,
              iconX: x,
              icon: option.icon,
              color: option.color,
              title: `${option.label} · ${event.eventName} · ${formatEventTime({ ...event, timestamp })}`,
              stackIndex: 0,
              compact: false,
            }
          })
          .filter((marker) => marker.x >= 0 && marker.x <= graphWidth)
      )

    const byEvent = new Map<string, typeof markers>()
    for (const marker of markers) {
      const current = byEvent.get(marker.eventId)
      if (current) current.push(marker)
      else byEvent.set(marker.eventId, [marker])
    }
    for (const eventMarkers of byEvent.values()) {
      const width = (eventMarkers.length - 1) * 16
      eventMarkers.forEach((marker, index) => {
        marker.stackIndex = index
        marker.iconX = Math.min(graphWidth - 9, Math.max(9, marker.x - width / 2 + index * 16))
      })
    }

    const byPosition = [...markers].sort((left, right) => left.iconX - right.iconX)
    for (let index = 1; index < byPosition.length; index += 1) {
      const previous = byPosition[index - 1]
      const current = byPosition[index]
      if (current.iconX - previous.iconX < 15) {
        previous.compact = true
        current.compact = true
      }
    }
    return markers
  })

  function setMarkerEnabled(type: RouteEldLogGraphMarkerType, enabled: boolean) {
    markerSettings.value[type] = enabled
  }

  function setAllMarkersEnabled(enabled: boolean) {
    for (const option of options) markerSettings.value[option.id] = enabled
  }

  return {
    markerOptions: options,
    markerSettings,
    graphMarkers,
    setMarkerEnabled,
    setAllMarkersEnabled,
  }
}

function locationState(location: string | null) {
  return location?.match(/,\s*([A-Z]{2})(?:\b|$)/)?.[1] ?? null
}

function eventMatchesMarker(
  event: RouteEldEvent,
  type: RouteEldLogGraphMarkerType,
  errorEventIds: Set<string>,
  noPtiEventIds: Set<string>,
  violationEventIds: Set<string>,
  stateChangeEventIds: Set<string>
) {
  const code = event.eventCode.toUpperCase()
  const text = `${event.eventName} ${event.notes ?? ''}`.toLowerCase()
  if (type === 'CERTIFICATION') return code.startsWith('DR_CERT') || code.startsWith('CERT')
  if (type === 'ENGINE_POWER_UP') return code.startsWith('ENG_UP') || code.startsWith('EPU')
  if (type === 'ENGINE_SHUT_DOWN') return code.startsWith('ENG_DOWN') || code.startsWith('ESD')
  if (type === 'STATE_CHANGE')
    return stateChangeEventIds.has(event.id) || /\bstate[\s-]?(?:change|line)\b/.test(text)
  if (type === 'PICK_UP')
    return /\bpick(?:ed)?[\s-]?up\b|\bpickup\b|\bhook(?:ed|ing)?\b|\bload(?:ed|ing)?\b/.test(text)
  if (type === 'LOGIN') return code === 'LOGIN' || code === 'DR_LOGIN'
  if (type === 'LOGOUT') return code === 'LOGOUT' || code === 'DR_LOGOUT'
  if (type === 'FUEL') return code.includes('FUEL') || /\bfuel(?:ed|ing)?\b/.test(text)
  if (type === 'DELIVERY')
    return (
      code.includes('DELIVERY') ||
      /\bdeliver(?:y|ed|ing)?\b|\bdrop(?:ped|ping)?\b|\bunload(?:ed|ing)?\b/.test(text)
    )
  if (type === 'PTI') return /\bpti\b|\bpre[\s-]?trip(?: inspection)?\b/.test(text)
  if (type === 'NO_PTI') return noPtiEventIds.has(event.id)
  if (type === 'DOT_INSPECTION')
    return code.includes('DOT') || /\bdot\b|\bscale\b|\bweigh(?:ed|ing)?\b/.test(text)
  if (type === 'REPAIRS') return /\brepairs?\b|\brepaired\b|\bmaintenance\b/.test(text)
  if (type === 'BREAK') return /\brest(?:ed|ing)?\b|\bbreak\b/.test(text)
  if (type === 'ERROR') return errorEventIds.has(event.id)
  return violationEventIds.has(event.id)
}
