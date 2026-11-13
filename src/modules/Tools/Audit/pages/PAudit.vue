<template>
  <main ref="pageRef" class="h-full overflow-y-scroll overscroll-contain bg-white p-[16px_24px]">
    <section class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-x-6">
        <h1 class="text-2xl font-semibold text-[#1A1A1A]">Trips</h1>
        <div class="flex items-center gap-x-2">
          <button
            v-for="(trip, ind) in auditFormAll.trips"
            :key="ind"
            type="button"
            class="w-9.5 h-9.5 flex items-center justify-center rounded-lg cursor-pointer transition-colors border"
            :class="[
              selectedTripIndex === ind
                ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white shadow-sm'
                : 'bg-[#F3F4F6] border-transparent text-[#666666] hover:bg-gray-200',
            ]"
            :aria-label="`Trip ${ind + 1}`"
            :aria-current="selectedTripIndex === ind ? 'step' : undefined"
            @click="selectTrip(ind)"
          >
            <span class="text-lg font-medium">{{ ind + 1 }}</span>
          </button>

          <button
            v-if="!tripsSaved"
            class="w-9.5 h-9.5 flex items-center justify-center bg-[#F3F4F6] hover:bg-gray-200 rounded-lg transition-colors text-[#1A1A1A] disabled:opacity-50"
            :disabled="loading || disableAuditForm"
            @click="addTrip"
          >
            <Plus class="w-5 h-5" />
          </button>
        </div>
      </div>

      <div class="flex items-center gap-x-3">
        <Button
          v-if="auditFormAll.trips.length > 1"
          variant="outline"
          class="px-8 h-10 border-[#B5B5B5] text-[#1A1A1A] font-medium"
          :disabled="
            auditFormAll.trips.length === 1 ||
              selectedTripIndex !== auditFormAll.trips.length - 1 ||
            loading ||
            disableAuditForm ||
            tripsSaved
          "
          @click="deleteTrip"
        >
          Delete
        </Button>
        <Button
          variant="outline"
          class="px-8 h-10 border-[#B5B5B5] text-[#1A1A1A] font-normal"
          :disabled="
            selectedTripIndex !== auditFormAll.trips.length - 1 ||
              loading ||
              disableAuditForm ||
              tripsSaved
          "
          @click="resetCurrentTrip"
        >
          Cancel
        </Button>
        <Button
          class="bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 text-white px-8 h-10 font-normal"
          :disabled="loading || disableAuditForm || tripsSaved"
          @click="handleSave"
        >
          <LoaderCircle v-if="loading" class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          {{ loading ? 'Generating draft...' : 'Generate draft' }}
        </Button>
      </div>
    </section>

    <p v-if="generationError" role="alert" class="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
      {{ generationError }}
    </p>
    <section v-for="(trip, ind) in auditFormAll.trips" :key="formKeys[ind]" class="mt-3">
      <KeepAlive>
        <CAuditForm
          v-if="selectedTripIndex === ind"
          ref="formRefs"
          :order="ind + 1"
          :trip="trip"
          :carriers="carriers"
          :drivers="drivers"
          :disabled="loading || tripsSaved"
          :constants="{
            carrierId: auditFormAll.carrierId,
            driverId: auditFormAll.driverId,
            startTime: auditFormAll.startTime as TimeValue,
            endTime: auditFormAll.endTime as TimeValue,
            startDate: auditFormAll.startDate as Dayjs,
            endDate: auditFormAll.endDate as Dayjs,
            odometer: auditFormAll.trips[0].odometer || 0,
            engineHours: auditFormAll.trips[0].engineHours || 0,
            distance: auditFormAll.trips[0].shiftDistanceInMile || auditFormAll.trips[0].dailyDistanceInMile || 0,
          }"
          @trip:update="updateTrip($event, ind)"
          @constants:update="updateConstants"
          @copy:from="handleCopy('from', $event)"
          @paste:from="handlePaste('from', $event)"
          @copy:to="handleCopy('to', $event)"
          @paste:to="handlePaste('to', $event)"
          @copy:fuel="handleCopy('fuel')"
          @paste:fuel="handlePaste('fuel')"
        />
      </KeepAlive>
    </section>
    <section class="mt-6 rounded-lg border border-border bg-card p-4">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold">Previous audits</h2>
        <Button variant="outline" size="sm" :disabled="loadingAudits" @click="loadPreviousAudits">
          Refresh
        </Button>
      </div>
      <p v-if="loadingAudits" class="text-sm text-muted-foreground">Loading audits...</p>
      <p v-else-if="auditsError" class="text-sm text-destructive">{{ auditsError }}</p>
      <p v-else-if="previousAudits.length === 0" class="text-sm text-muted-foreground">
        No generated audits yet.
      </p>
      <div v-else class="divide-y divide-border">
        <div v-for="audit in previousAudits" :key="audit.id" class="flex items-center justify-between gap-4 py-3 text-sm">
          <div>
            <div class="font-medium">{{ audit.driverName }}</div>
            <div class="text-muted-foreground">{{ audit.fromDate }} → {{ audit.toDate }} · {{ audit.status }}</div>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" :disabled="loadingAuditId === audit.id" @click="restoreAudit(audit.id)">
              <LoaderCircle v-if="loadingAuditId === audit.id" class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Use values
            </Button>
            <Button variant="outline" size="sm" @click="$router.push({ path: `/logs/${audit.driverId}/boost`, query: { sessionId: audit.id, auditSessionId: audit.id } })">
              Open
            </Button>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { LoaderCircle, Plus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage, useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import type { RouteEldEventSessionListItem, RouteEldEventSessionPage } from '@/modules/ELD/LogsModule/Boost/types/boost'
import CAuditForm from '../components/CAuditForm.vue'
import { useAuditForm } from '../composables/useAuditForm'
import dayjs, { type Dayjs } from 'dayjs'
import type { AuditRequest, TimeValue } from '../types'

const {
  loading,
  generationError,
  tripsSaved,
  carriers,
  drivers,
  auditFormAll,
  auditId,
  formKeys,
  selectedTripIndex,
  disableAuditForm,
  addTrip,
  deleteTrip,
  selectTrip,
  resetCurrentTrip,
  updateTrip,
  updateConstants,
  copyLongLat,
  pasteLongLat,
  addAudit,
  navigateToBoost,
} = useAuditForm()

const formRefs = ref<InstanceType<typeof CAuditForm>[]>([])
const api = useApi()
const pageRef = ref<HTMLElement | null>(null)
const previousAudits = ref<RouteEldEventSessionListItem[]>([])
const loadingAudits = ref(false)
const auditsError = ref('')
const loadingAuditId = ref('')

async function restoreAudit(sessionId: string) {
  loadingAuditId.value = sessionId
  auditsError.value = ''
  try {
    const response = await api.get<AuditRequest | { successResult: AuditRequest }>(`${ApiEndpoints.AUDIT}/${sessionId}/input`)
    const input = 'successResult' in response.data ? response.data.successResult : response.data
    auditFormAll.carrierId = input.carrierId || auditFormAll.carrierId
    auditFormAll.driverId = input.driverId
    auditFormAll.startDate = dayjs(input.startDate as string)
    auditFormAll.endDate = auditFormAll.startDate
    const [hours = 0, minutes = 0, seconds = 0] = String(input.startTime).split(':').map(Number)
    auditFormAll.startTime = { hours, minutes, seconds }
    auditFormAll.endTime = { hours, minutes, seconds }
    auditFormAll.trips.splice(0, auditFormAll.trips.length, ...input.trips)
    formKeys.value = input.trips.map((_, index) => Date.now() + index)
    selectedTripIndex.value = 0
    tripsSaved.value = false
    auditId.value = ''
    generationError.value = ''
    pageRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    auditsError.value = getApiErrorMessage(error, 'Could not load the saved audit values.')
  } finally {
    loadingAuditId.value = ''
  }
}

async function loadPreviousAudits() {
  loadingAudits.value = true
  auditsError.value = ''
  try {
    const rows: RouteEldEventSessionListItem[] = []
    let pageNumber = 1
    let totalPages = 1
    do {
      const response = await api.get<RouteEldEventSessionPage | { successResult: RouteEldEventSessionPage }>(
        ApiEndpoints.ROUTE_ELD_EVENT_SESSIONS,
        { params: { search: 'Audit:', pageNumber, pageSize: 100, sortBy: 'createdAt', sortOrder: 'desc' } }
      )
      const page = 'successResult' in response.data ? response.data.successResult : response.data
      rows.push(...page.data.filter((item) => item.name.startsWith('Audit:')))
      totalPages = page.pagination.totalPages
      pageNumber++
    } while (pageNumber <= totalPages)
    previousAudits.value = rows
  } catch (error) {
    auditsError.value = error instanceof Error ? error.message : 'Could not load previous audits.'
  } finally {
    loadingAudits.value = false
  }
}

onMounted(() => { void loadPreviousAudits() })

function getFormRef() {
  return formRefs.value?.[0]
}

function handleCopy(type: 'from' | 'to' | 'fuel', index = 0) {
  const form = getFormRef()?.form
  if (!form) return
  const location = type === 'from' ? form.fromLocations[index] :
    type === 'to' ? form.toLocations[index] : form.fuel
  if (location) copyLongLat(location)
}

function handlePaste(type: 'from' | 'to' | 'fuel', index = 0) {
  const form = getFormRef()?.form
  if (!form) return
  const location = type === 'from' ? form.fromLocations[index] :
    type === 'to' ? form.toLocations[index] : form.fuel
  if (location) pasteLongLat(location)
}

async function handleSave() {
  await addAudit()
  if (auditId.value) {
    await navigateToBoost()
  }
}
</script>
