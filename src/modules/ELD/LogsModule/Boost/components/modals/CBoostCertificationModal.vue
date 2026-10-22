<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>Certification report</DialogTitle>
        <DialogDescription>
          Certification status per day for this period, based on the active tab.
        </DialogDescription>
      </DialogHeader>

      <div v-if="report" class="space-y-1">
        <div class="h-2.5 w-full overflow-hidden rounded-full bg-red-500">
          <div class="h-full rounded-full bg-green-500 transition-all" :style="{ width: `${percentage}%` }" />
        </div>
        <div class="text-right text-xs font-medium text-muted-foreground">
          {{ report.certifiedDays }}/{{ report.totalDays }}
        </div>
      </div>

      <div v-if="report" class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="rounded-lg border p-3">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">Certified days</div>
          <div class="mt-1 text-lg font-semibold tabular-nums">{{ report.certifiedDays }} / {{ report.totalDays }}</div>
        </div>
        <div class="rounded-lg border p-3">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">Company</div>
          <div class="mt-1 truncate text-sm font-semibold">{{ report.companyName || '—' }}</div>
        </div>
        <div class="rounded-lg border p-3">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">Driver</div>
          <div class="mt-1 truncate text-sm font-semibold">{{ report.driverName || '—' }}</div>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-auto rounded-md border">
        <div v-if="loading" class="p-10 text-center text-sm text-muted-foreground">Loading certification report...</div>
        <table v-else class="w-full min-w-190 text-sm">
          <thead class="sticky top-0 z-20 bg-background shadow-sm">
            <tr class="border-b text-left text-xs uppercase text-muted-foreground">
              <th class="px-4 py-3">Certified date</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Certification events</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in groups" :key="group.key">
              <tr
                class="border-b transition-colors"
                :class="group.certifications.length ? 'cursor-pointer hover:bg-muted/50' : ''"
                @click="toggleGroup(group.key, group.certifications.length)"
              >
                <td class="px-4 py-3 font-medium">
                  <span v-if="group.logDate">{{ formatDay(group.logDate) }}</span>
                  <span v-else class="text-red-600">Invalid certification date</span>
                </td>
                <td class="px-4 py-3">
                  <span :class="statusClass(group)" class="inline-flex rounded border px-2 py-0.5 text-xs font-semibold">
                    {{ statusLabel(group) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div v-if="group.certifications.length" class="flex items-center justify-between gap-3">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-medium">{{ group.certifications.length }} {{ group.certifications.length === 1 ? 'event' : 'events' }}</span>
                      <span :class="validationClass(group)" class="rounded border px-2 py-0.5 text-[11px] font-semibold">
                        {{ validationLabel(group) }}
                      </span>
                    </div>
                    <ChevronDown class="h-4 w-4 transition-transform" :class="openGroups.has(group.key) ? 'rotate-180' : ''" />
                  </div>
                  <span v-else class="text-xs text-muted-foreground">No Certification</span>
                </td>
              </tr>
              <tr v-if="group.certifications.length && openGroups.has(group.key)" class="border-b bg-muted/30">
                <td colspan="3" class="p-3">
                  <div class="overflow-x-auto rounded border bg-background">
                    <table class="w-full min-w-180 text-xs">
                      <thead class="bg-muted/60 text-left text-muted-foreground">
                        <tr><th class="p-3">Event</th><th class="p-3">Location</th><th class="p-3">Odometer</th><th class="p-3">Engine hours</th><th class="p-3">Validation</th></tr>
                      </thead>
                      <tbody>
                        <tr v-for="cert in group.certifications" :key="cert.eventId" class="border-t">
                          <td class="p-3 align-top">
                            <div class="font-medium">{{ formatTime(cert.timestamp) }}</div>
                            <div class="mt-1 text-muted-foreground">Certifies: {{ cert.certifiedLogDate?.trim() || 'Missing' }}</div>
                            <div class="mt-1 text-muted-foreground">Log date: {{ formatDay(cert.eventLogDate) }}</div>
                            <div class="mt-1 text-muted-foreground"><span v-if="cert.sequenceId">#{{ sequenceDecimal(cert.sequenceId) }} · </span>{{ cert.eventCode }}</div>
                          </td>
                          <td class="p-3 align-top">
                            <div>{{ cert.driverLocationDescription || cert.location || '—' }}</div>
                            <div class="mt-1 text-muted-foreground">{{ cert.positioning || 'No positioning' }}</div>
                            <div v-if="coordinates(cert)" class="mt-1 font-mono text-muted-foreground">{{ coordinates(cert) }}</div>
                          </td>
                          <td class="p-3 align-top tabular-nums">{{ numberOrDash(cert.odometerMiles) }}</td>
                          <td class="p-3 align-top tabular-nums">{{ numberOrDash(cert.engineHours) }}</td>
                          <td class="p-3 align-top">
                            <div v-if="cert.requiresFix" class="flex flex-wrap gap-1">
                              <span v-for="issue in issueLabels(cert)" :key="issue" class="rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">{{ issue }}</span>
                            </div>
                            <span v-else class="rounded border border-green-300 bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">VALID</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-if="!groups.length"><td colspan="3" class="p-10 text-center text-muted-foreground">No days to certify in this period.</td></tr>
          </tbody>
        </table>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">Close</Button>
        <Button :disabled="loading || fixing || !canEdit || !needsFix" @click="$emit('apply')">
          <ShieldCheck class="mr-2 h-4 w-4" /> {{ fixing ? 'Applying...' : 'Certification fix' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { ChevronDown, ShieldCheck } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { RouteEldCertificationEvent, RouteEldCertificationReport } from '../../types/boost'
import { resolveRouteEldScheduleTimeZone } from '../../composables/useScheduleBoost'

const props = withDefaults(defineProps<{ open: boolean; report: RouteEldCertificationReport | null; loading?: boolean; fixing?: boolean; canEdit?: boolean; timeZone?: string | null }>(), { loading: false, fixing: false, canEdit: false, timeZone: 'CT' })
defineEmits<{ 'update:open': [value: boolean]; apply: [] }>()

type Group = { key: string; logDate: string | null; isSigned: boolean | null; invalid: boolean; certifications: RouteEldCertificationEvent[] }
const groups = computed<Group[]>(() => {
  const days: Group[] = (props.report?.days ?? []).map((day) => ({ key: day.logDate, logDate: day.logDate, isSigned: day.isSigned, invalid: false, certifications: day.certifications ?? [] }))
  if (props.report?.invalidDateCertifications?.length) days.push({ key: '__invalid__', logDate: null, isSigned: null, invalid: true, certifications: props.report.invalidDateCertifications })
  return days
})
const openGroups = ref(new Set<string>())
const duplicate = (group: Group) => group.certifications.filter((item) => item.isCertificationDateValid).length > 1
const groupNeedsFix = (group: Group) => duplicate(group) || group.certifications.some((item) => item.requiresFix)
watch([() => props.open, groups], ([open, values]) => { openGroups.value = open ? new Set((values as Group[]).filter(groupNeedsFix).map((group) => group.key)) : new Set() }, { immediate: true })
const percentage = computed(() => props.report?.totalDays ? Math.round((props.report.certifiedDays / props.report.totalDays) * 100) : 0)
const needsFix = computed(() => Boolean(props.report && (props.report.certifiedDays < props.report.totalDays || groups.value.some(groupNeedsFix))))
const toggleGroup = (key: string, count: number) => {
  if (!count) return
  const next = new Set(openGroups.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  openGroups.value = next
}
const formatDay = (value: string) => dayjs(value).format('MMM D, YYYY')
const formatTime = (timestamp: number) => new Intl.DateTimeFormat('en-US', { timeZone: resolveRouteEldScheduleTimeZone(props.timeZone), month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date(timestamp))
const sequenceDecimal = (value: string) => { const clean = value.replace(/^0x/i, ''); try { return /^[0-9a-f]+$/i.test(clean) ? BigInt(`0x${clean}`).toString(10) : value } catch { return value } }
const coordinates = (item: RouteEldCertificationEvent) => item.latitude == null || item.longitude == null ? '' : `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}`
const numberOrDash = (value: number | null) => value == null ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: 1 })
const issueLabels = (item: RouteEldCertificationEvent) => [!item.isCertificationDateValid ? 'INVALID DATE' : '', item.hasProhibitedData ? 'PROHIBITED DATA' : ''].filter(Boolean)
const statusLabel = (group: Group) => group.invalid ? 'INVALID DATE' : group.isSigned === true ? 'SIGNED' : group.isSigned === false ? 'NOT SIGNED' : 'OUTSIDE PERIOD'
const statusClass = (group: Group) => group.invalid || group.isSigned === false ? 'border-red-300 bg-red-100 text-red-700' : group.isSigned === true ? 'border-green-300 bg-green-100 text-green-700' : 'border-slate-300 bg-slate-100 text-slate-600'
const validationLabel = (group: Group) => duplicate(group) ? 'DUPLICATE DATE' : groupNeedsFix(group) ? 'NEEDS FIX' : 'VALID'
const validationClass = (group: Group) => groupNeedsFix(group) ? 'border-red-300 bg-red-50 text-red-700' : 'border-green-300 bg-green-50 text-green-700'
</script>
