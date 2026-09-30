<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[520px] p-0 gap-0 overflow-hidden">
      <DialogHeader class="px-6 py-4 border-b">
        <DialogTitle class="text-xl font-bold">Reassign / Replicate Events</DialogTitle>
      </DialogHeader>

      <div class="px-6 py-6 space-y-4">
        <div class="text-sm text-muted-foreground">
          Selected events: <span class="font-medium text-foreground">{{ selectedCount }}</span>
        </div>

        <!-- Action type toggle -->
        <div class="flex gap-2">
          <Button
            type="button"
            class="flex-1"
            :variant="actionType === 'reassign' ? 'default' : 'outline'"
            @click="actionType = 'reassign'"
          >
            Reassign
          </Button>
          <Button
            type="button"
            class="flex-1"
            :variant="actionType === 'replicate' ? 'default' : 'outline'"
            @click="actionType = 'replicate'"
          >
            Replicate
          </Button>
        </div>

        <!-- Carrier select -->
        <div class="space-y-1">
          <label class="text-xs font-medium text-muted-foreground">Carrier</label>
          <Select v-model="selectedCarrierId" @update:model-value="onCarrierChange">
            <SelectTrigger :disabled="isCarriersLoading">
              <SelectValue :placeholder="isCarriersLoading ? 'Loading carriers...' : 'Select carrier'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="carrier in carriers"
                :key="carrier.id"
                :value="carrier.id"
              >
                {{ carrier.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Driver select -->
        <div class="space-y-1">
          <label class="text-xs font-medium text-muted-foreground">To Driver</label>
          <Select v-model="toDriverId" :disabled="!selectedCarrierId || isDriversLoading">
            <SelectTrigger>
              <SelectValue :placeholder="isDriversLoading ? 'Loading drivers...' : 'Select driver'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="driver in drivers"
                :key="driver.id"
                :value="driver.id"
              >
                {{ driver.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div class="px-6 py-4 border-t flex items-center justify-end gap-2 bg-white dark:bg-card">
        <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
        <Button
          class="bg-black text-white hover:bg-black/90"
          :disabled="loading || selectedCount === 0 || !toDriverId"
          @click="handleSubmit"
        >
          {{ loading ? (actionType === 'reassign' ? 'Reassigning…' : 'Replicating…') : (actionType === 'reassign' ? 'Reassign' : 'Replicate') }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useCarriersDrivers } from '@/composables/useCarriersDrivers'

const props = withDefaults(
  defineProps<{
    open: boolean
    selectedCount: number
    loading?: boolean
  }>(),
  {
    loading: false,
  }
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submit', payload: { toDriverId: string; actionType: 'reassign' | 'replicate' }): void
}>()

const { carriers, drivers, fetchCarriers, fetchDrivers } = useCarriersDrivers()

const toDriverId = ref('')
const selectedCarrierId = ref('')
const actionType = ref<'reassign' | 'replicate'>('reassign')
const isCarriersLoading = ref(false)
const isDriversLoading = ref(false)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    toDriverId.value = ''
    selectedCarrierId.value = ''
    actionType.value = 'reassign'
    isCarriersLoading.value = true
    try {
      await fetchCarriers()
    } finally {
      isCarriersLoading.value = false
    }
  }
)

async function onCarrierChange(carrierId: string) {
  toDriverId.value = ''
  isDriversLoading.value = true
  try {
    await fetchDrivers(carrierId)
  } finally {
    isDriversLoading.value = false
  }
}

const handleSubmit = () => {
  emit('submit', { toDriverId: toDriverId.value, actionType: actionType.value })
}
</script>
