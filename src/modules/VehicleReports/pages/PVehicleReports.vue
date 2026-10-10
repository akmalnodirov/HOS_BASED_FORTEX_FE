<template>
  <div
    class="flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden bg-white p-[16px_24px] dark:bg-background"
  >
    <div class="mb-4 flex flex-none flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h1 class="text-xl font-semibold text-foreground">Vehicle reports</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Active vehicles are those whose driver worked 4+ of any rolling 7 days in the month
        </p>
      </div>
      <div class="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
        <CVehicleReportMonthPicker v-model="monthValue" :maximum="currentMonth" />
        <Button
          variant="outline"
          class="h-10"
          :disabled="isLoading || !companyId"
          @click="loadReport"
        >
          <RefreshCw
            v-if="hasCompletedLoad"
            :class="['mr-2 h-4 w-4', isLoading && 'animate-spin']"
          />
          <Loader2 v-else-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
          <Download v-else class="mr-2 h-4 w-4" />
          {{ hasCompletedLoad ? 'Refresh' : isLoading ? 'Loading…' : 'Load' }}
        </Button>
        <Button class="h-10" :disabled="generating" @click="downloadFullReport">
          <Loader2 v-if="generating" class="mr-2 h-4 w-4 animate-spin" />
          <FileDown v-else class="mr-2 h-4 w-4" />
          Generate full report
        </Button>
      </div>
    </div>

    <div class="mb-3 grid flex-none grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="rounded-lg border border-border bg-card px-4 py-3">
        <div class="text-xs text-muted-foreground">Vehicles</div>
        <div class="text-2xl font-semibold text-foreground">{{ report?.vehicles.length ?? 0 }}</div>
      </div>
      <div class="rounded-lg border border-border bg-card px-4 py-3">
        <div class="text-xs text-muted-foreground">Active &amp; worked</div>
        <div class="text-2xl font-semibold text-green-700 dark:text-green-400">
          {{ report?.activeCount ?? 0 }}
        </div>
      </div>
      <div class="rounded-lg border border-border bg-card px-4 py-3">
        <div class="text-xs text-muted-foreground">Inactive</div>
        <div class="text-2xl font-semibold text-red-700 dark:text-red-400">
          {{ report?.inactiveCount ?? 0 }}
        </div>
      </div>
      <div class="rounded-lg border border-border bg-card px-4 py-3">
        <div class="text-xs text-muted-foreground">Month</div>
        <div class="text-2xl font-semibold text-foreground">{{ monthLabel }}</div>
      </div>
    </div>

    <div
      class="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card [&>div]:overflow-visible"
    >
      <Table>
        <TableHeader class="sticky top-0 z-20 bg-muted">
          <TableRow class="bg-muted hover:bg-muted">
            <TableHead>Vehicle</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="text-right">Worked days</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>VIN</TableHead>
            <TableHead>Make / Model / Year</TableHead>
            <TableHead>Plate</TableHead>
            <TableHead>ELD serial</TableHead>
            <TableHead>Route ELD flag</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="9" class="h-28 text-center text-sm text-muted-foreground">
              Loading vehicle report…
            </TableCell>
          </TableRow>
          <TableRow v-else-if="error">
            <TableCell colspan="9" class="h-28 text-center text-sm text-red-600 dark:text-red-400">
              {{ error }}
            </TableCell>
          </TableRow>
          <TableRow v-else-if="!hasRequested">
            <TableCell colspan="9" class="h-28 text-center text-sm text-muted-foreground">
              Select a month and click Load to view vehicle reports.
            </TableCell>
          </TableRow>
          <template v-else>
            <TableRow v-for="vehicle in report?.vehicles ?? []" :key="vehicle.vehicleId">
              <TableCell class="font-medium text-foreground">{{ vehicle.name }}</TableCell>
              <TableCell>
                <span
                  v-if="vehicle.worked"
                  class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-950/50 dark:text-green-400"
                >
                  Active
                </span>
                <span
                  v-else
                  class="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground"
                >
                  Inactive
                </span>
              </TableCell>
              <TableCell class="text-right tabular-nums">{{ vehicle.workedDays }}</TableCell>
              <TableCell>{{ vehicle.driverName || '—' }}</TableCell>
              <TableCell class="font-mono text-xs">{{ vehicle.vin || '—' }}</TableCell>
              <TableCell>{{ vehicleDescription(vehicle) }}</TableCell>
              <TableCell>{{ vehicle.plateNumber || '—' }}</TableCell>
              <TableCell class="font-mono text-xs">{{ vehicle.eldSerialNumber || '—' }}</TableCell>
              <TableCell>
                <span
                  :class="
                    vehicle.isActiveFlag
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-muted-foreground'
                  "
                >
                  {{ vehicle.isActiveFlag ? 'Active' : 'Inactive' }}
                </span>
              </TableCell>
            </TableRow>
            <TableRow v-if="!(report?.vehicles ?? []).length">
              <TableCell colspan="9" class="h-28 text-center text-sm text-muted-foreground">
                No vehicles were found for the selected company and month.
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>

    <div class="fixed -left-[10000px] top-0 w-[794px]">
      <div
        v-if="fullReport"
        id="full-vehicle-report-document"
        style="
          padding: 32px;
          background: #ffffff;
          color: #0f172a;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        "
      >
        <div
          style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
          "
        >
          <div style="font-size: 22px; font-weight: 700">Vehicle activity report</div>
          <div style="font-size: 13px; color: #64748b">{{ monthLabel }}</div>
        </div>
        <div style="font-size: 13px; color: #64748b; margin-bottom: 24px">
          {{ fullReport.companyCount }} companies · {{ fullReport.workedCount }} vehicles with
          worked days
        </div>
        <div
          v-for="company in fullReport.companies"
          :key="company.companyId"
          style="margin-bottom: 28px; break-inside: avoid; page-break-inside: avoid"
        >
          <div
            style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #1e293b;
              padding-bottom: 4px;
              margin-bottom: 8px;
            "
          >
            <div style="font-size: 16px; font-weight: 600">{{ company.companyName }}</div>
            <div style="font-size: 12px; color: #64748b">{{ company.workedCount }} vehicles</div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px">
            <thead>
              <tr style="background: #f1f5f9; text-align: left">
                <th style="padding: 6px 8px">Vehicle</th>
                <th style="padding: 6px 8px; text-align: right">Worked days</th>
                <th style="padding: 6px 8px">Driver</th>
                <th style="padding: 6px 8px">VIN</th>
                <th style="padding: 6px 8px">Plate</th>
                <th style="padding: 6px 8px">ELD serial</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="vehicle in company.vehicles"
                :key="vehicle.vehicleId"
                style="border-bottom: 1px solid #e2e8f0"
              >
                <td style="padding: 6px 8px; font-weight: 500">{{ vehicle.name }}</td>
                <td style="padding: 6px 8px; text-align: right">{{ vehicle.workedDays }}</td>
                <td style="padding: 6px 8px">{{ vehicle.driverName || '—' }}</td>
                <td style="padding: 6px 8px">{{ vehicle.vin || '—' }}</td>
                <td style="padding: 6px 8px">{{ vehicle.plateNumber || '—' }}</td>
                <td style="padding: 6px 8px">{{ vehicle.eldSerialNumber || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { Download, FileDown, Loader2, RefreshCw } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import CVehicleReportMonthPicker from '@/modules/VehicleReports/components/CVehicleReportMonthPicker.vue'
import { useVehicleReports } from '@/modules/VehicleReports/composables/useVehicleReports'
import type { FullVehicleReportResponse, VehicleReportRow } from '@/modules/VehicleReports/types'

const authStore = useAuthStore()
const currentMonth = dayjs().format('YYYY-MM')
const monthValue = ref(currentMonth)
const year = computed(() => Number(monthValue.value.slice(0, 4)))
const month = computed(() => Number(monthValue.value.slice(5, 7)))
const monthLabel = computed(() => dayjs(`${monthValue.value}-01`).format('MMM YYYY'))
const companyId = computed(() => authStore.company?.id ?? '')

const { report, isLoading, error, fetchReport, fetchFullReport, resetReport } = useVehicleReports()
const fullReport = ref<FullVehicleReportResponse | null>(null)
const generating = ref(false)
const hasRequested = ref(false)
const hasCompletedLoad = ref(false)

watch([companyId, monthValue], () => {
  hasRequested.value = false
  hasCompletedLoad.value = false
  resetReport()
})

async function loadReport() {
  const requestedCompanyId = companyId.value
  const requestedMonth = monthValue.value
  hasRequested.value = true
  await fetchReport(requestedCompanyId, year.value, month.value)
  if (companyId.value === requestedCompanyId && monthValue.value === requestedMonth) {
    hasCompletedLoad.value = true
  }
}

function vehicleDescription(vehicle: VehicleReportRow): string {
  return [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' / ') || '—'
}

async function downloadFullReport() {
  generating.value = true
  try {
    const data = await fetchFullReport(year.value, month.value)
    fullReport.value = data
    if (!data.companies.length) {
      toast.info('No vehicles with worked days were found for this month.')
      return
    }

    await nextTick()
    const html2pdf = (await import('html2pdf.js')).default
    const source = document.getElementById('full-vehicle-report-document')
    if (!source) throw new Error('Vehicle report document could not be rendered.')

    await html2pdf()
      .set({
        margin: 8,
        filename: `vehicle-report-${monthValue.value}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(source)
      .save()
  } catch {
    toast.error('Could not build the full report. Please try again.')
  } finally {
    generating.value = false
  }
}
</script>
