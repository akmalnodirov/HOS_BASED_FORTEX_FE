<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { Driver } from '../types'

const props = defineProps<{
  open: boolean
  drivers: Driver[]
  initialDriverId: string | null
  isLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'save', driverId: string): void
}>()

const selectedDriverId = ref<string | null>(null)

// Initialize selection when modal opens
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      selectedDriverId.value = props.initialDriverId
    }
  },
  { immediate: true }
)

const handleSave = () => {
  if (selectedDriverId.value) {
    emit('save', selectedDriverId.value)
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[425px] p-0 overflow-hidden">
      <DialogHeader class="px-6 py-4 border-b">
        <DialogTitle class="text-xl font-semibold">Driver</DialogTitle>
      </DialogHeader>
      <div class="px-6 py-8">
        <Select v-model="selectedDriverId">
          <SelectTrigger class="w-full">
            <SelectValue placeholder="Select driver" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="driver in drivers"
              :key="driver.driverId"
              :value="driver.driverId"
            >
              {{ driver.firstName }} {{ driver.lastName }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter class="px-6 py-4 border-t flex flex-row gap-3 sm:justify-center">
        <Button variant="outline" class="flex-1" @click="emit('update:open', false)">
          Cancel
        </Button>
        <Button
          class="flex-1 bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 text-white"
          @click="handleSave"
          :disabled="!selectedDriverId || isLoading"
        >
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
