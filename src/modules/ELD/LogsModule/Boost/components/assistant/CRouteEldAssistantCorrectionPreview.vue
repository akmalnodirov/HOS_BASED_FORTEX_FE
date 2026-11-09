<template>
  <div class="space-y-3 text-xs">
    <dl class="space-y-2">
      <div>
        <dt class="font-medium">
          {{ preview.isNewStatus ? 'Reported status reason' : 'Reported correction reason' }}
        </dt>
        <dd class="whitespace-pre-wrap break-words">{{ preview.reason }}</dd>
      </div>
      <div>
        <dt class="font-medium">Original request</dt>
        <dd class="whitespace-pre-wrap break-words">
          {{ stripApplyMarker(preview.originalRequest) }}
        </dd>
      </div>
    </dl>
    <ol aria-label="Exact proposed operations" class="space-y-2">
      <li
        v-for="operation in preview.operations"
        :key="`${operation.order}-${operation.eventId}`"
        class="space-y-1 rounded border p-2"
      >
        <p class="font-medium">
          {{ operation.order }}.
          {{ operation.type === 'InsertDutyStatus' ? 'New status event' : operation.type }}
        </p>
        <p v-if="operation.type !== 'InsertDutyStatus'" class="break-all">
          Event: {{ operation.eventId }}
        </p>
        <p v-if="operation.type === 'InsertDutyStatus'">Before: No event</p>
        <p v-else>
          Before: {{ operation.beforeEventCode ?? '—' }} ·
          {{ timestamp(operation.beforeTimestamp, operation.timeZone) }}
        </p>
        <p v-if="operation.type === 'DeleteEvent'">After: Event deleted</p>
        <p v-else>
          After:
          {{
            operation.type === 'InsertDutyStatus'
              ? statusName(operation.afterEventCode)
              : (operation.afterEventCode ?? '—')
          }}
          ·
          {{
            operation.type === 'ChangeToOffDuty' && operation.afterTimestamp === null
              ? 'Timestamp unchanged'
              : timestamp(operation.afterTimestamp, operation.timeZone)
          }}
        </p>
        <p v-if="operation.timeZone">Log time zone: {{ operation.timeZone }}</p>
      </li>
    </ol>
    <p class="break-all text-muted-foreground">
      Session: {{ preview.sessionId }} · Tab: {{ preview.tabId }}
      <template v-if="!preview.isNewStatus">
        <br />
        Repair: {{ preview.repairId }} · Option: {{ preview.optionId }}
      </template>
    </p>
    <p v-if="preview.isNewStatus" class="text-muted-foreground">
      Location and vehicle readings were not provided. This adds an actual event to the draft only.
    </p>
  </div>
</template>

<script setup lang="ts">
import { stripApplyMarker } from '@/modules/ELD/LogsModule/Ai/utils/aiOptions'
import { resolveRouteEldScheduleTimeZone } from '@/utils/routeEldTimeZone'
import type { RouteEldAssistantCorrectionPreview } from '../../types/assistant'

defineProps<{ preview: RouteEldAssistantCorrectionPreview }>()

function statusName(code?: string | null) {
  const names: Record<string, string> = {
    DS_ON: 'On Duty',
    DS_OFF: 'Off Duty',
    DS_SB: 'Sleeper Berth',
  }
  return names[code ?? ''] ?? code ?? '—'
}

function timestamp(value: number | null, timeZone?: string | null) {
  if (value === null) return 'None'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const sourceZone = timeZone?.trim() || 'UTC'
  let zone = resolveRouteEldScheduleTimeZone(sourceZone, sourceZone)
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
  } catch {
    zone = 'UTC'
  }
  const local = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    dateStyle: 'medium',
    timeStyle: 'long',
  }).format(date)
  return `${local} · ${date.toISOString()} (${value} ms)`
}
</script>
