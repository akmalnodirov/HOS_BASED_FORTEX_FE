<template>
  <main class="min-h-screen bg-white p-[16px_24px]">
    <!-- Header -->
    <section class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-x-6">
        <h1 class="text-2xl font-semibold text-[#1A1A1A]">Audit</h1>

        <div class="flex items-center gap-x-2">
          <!-- Trip number buttons -->
          <div
            v-for="(trip, ind) in auditFormAll.trips"
            :key="ind"
            class="w-9.5 h-9.5 flex items-center justify-center rounded-lg cursor-pointer transition-colors border border-transparent"
            :class="[
              selectedTripIndex === ind
                ? 'bg-[#F3F4F6] border-[#B5B5B5]'
                : 'bg-[#F3F4F6] text-[#666666] hover:bg-gray-200',
            ]"
            @click="selectTrip(ind)"
          >
            <span class="text-lg font-medium text-[#1A1A1A]">{{ ind + 1 }}</span>
          </div>

          <!-- Add trip button -->
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
          Save
        </Button>
      </div>
    </section>

    <!-- Trip Form -->
    <section v-for="(trip, ind) in auditFormAll.trips" :key="formKeys[ind]" class="mt-3">
      <KeepAlive>
        <CAuditForm
          v-if="selectedTripIndex === ind"
          ref="formRefs"
          :order="ind + 1"
          :companies="companies"
          :drivers="drivers"
          :disabled="loading || tripsSaved"
          :constants="{
            companyId: auditFormAll.companyId,
            driverId: auditFormAll.driverId,
            startTime: auditFormAll.startTime as TimeValue,
            endTime: auditFormAll.endTime as TimeValue,
            startDate: auditFormAll.startDate as Dayjs,
            endDate: auditFormAll.endDate as Dayjs,
            odometer: auditFormAll.trips[0].odometer || 0,
            engineHours: auditFormAll.trips[0].engineHours || 0,
            distance: auditFormAll.trips[0].dailyDistanceInMile || 0,
          }"
          @trip:update="updateTrip($event, ind)"
          @constants:update="updateConstants"
          @copy:from="handleCopy('from', ind)"
          @paste:from="handlePaste('from', ind)"
          @copy:to="handleCopy('to', ind)"
          @paste:to="handlePaste('to', ind)"
          @copy:fuel="handleCopy('fuel', ind)"
          @paste:fuel="handlePaste('fuel', ind)"
        />
      </KeepAlive>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import CAuditForm from '../components/CAuditForm.vue'
import { useAuditForm } from '../composables/useAuditForm'
import type { Dayjs } from 'dayjs'
import type { TimeValue } from '../types'

const {
  loading,
  tripsSaved,
  companies,
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
  navigateToDetail,
} = useAuditForm()

const formRefs = ref<InstanceType<typeof CAuditForm>[]>([])

function getFormRef() {
  return formRefs.value?.[0]
}

function handleCopy(type: 'from' | 'to' | 'fuel', _index: number) {
  const form = getFormRef()?.form
  if (!form) return
  copyLongLat(form[type])
}

function handlePaste(type: 'from' | 'to' | 'fuel', _index: number) {
  const form = getFormRef()?.form
  if (!form) return
  pasteLongLat(form[type])
}

async function handleSave() {
  await addAudit()
  if (auditId.value) {
    await navigateToDetail()
  }
}
</script>
