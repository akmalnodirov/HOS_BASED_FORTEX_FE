<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit Event</DialogTitle>
      </DialogHeader>

      <form @submit.prevent="$emit('submit')" class="space-y-4">
        <div class="grid grid-cols-12 gap-4">
          <!-- Sequence ID -->
          <div class="col-span-3">
            <Label for="sequenceId">Sequence ID</Label>
            <Input
              id="sequenceId"
              v-model.number="editStatus.id"
              type="number"
              disabled
              class="bg-gray-50 dark:bg-muted/30"
            />
          </div>

          <!-- Event Type -->
          <div class="col-span-9">
            <Label for="event">Event</Label>
            <Select v-model="editStatus.event.eventType">
              <SelectTrigger>
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="1">Off Duty</SelectItem>
                <SelectItem :value="2">Sleep Berth</SelectItem>
                <SelectItem :value="3">Driving</SelectItem>
                <SelectItem :value="4">On Duty</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Start Date -->
          <div class="col-span-6">
            <Label for="startDate">Start Date</Label>
            <Input
              id="startDate"
              :value="formatDate(editStatus.startDate)"
              type="datetime-local"
              @change="handleDateChange"
            />
          </div>

          <!-- Origin -->
          <div class="col-span-6">
            <Label for="origin">Origin</Label>
            <Select v-model="editStatus.origin">
              <SelectTrigger>
                <SelectValue placeholder="Select origin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="1">Auto</SelectItem>
                <SelectItem :value="2">Driver</SelectItem>
                <SelectItem :value="3">Edit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Vehicle -->
          <div class="col-span-6">
            <Label for="vehicle">Vehicle</Label>
            <Select v-model="editStatus.vehicleId">
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="vehicle in editStatus.vehicles"
                  :key="vehicle.id"
                  :value="vehicle.id"
                >
                  {{ vehicle.unit }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Odometer -->
          <div class="col-span-3">
            <Label for="odometer">Odometer</Label>
            <Input id="odometer" v-model.number="editStatus.odometer" type="number" min="0" />
          </div>

          <!-- Engine Hours -->
          <div class="col-span-3">
            <Label for="engineHours">Engine Hours</Label>
            <Input
              id="engineHours"
              v-model.number="editStatus.engine_hours"
              type="number"
              min="0"
              step="0.1"
            />
          </div>

          <!-- Location Origin -->
          <div class="col-span-12">
            <Label for="locationOrigin">Location Origin</Label>
            <Select v-model="editStatus.location_origin">
              <SelectTrigger>
                <SelectValue placeholder="Select location origin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="1">Automatic</SelectItem>
                <SelectItem :value="2">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Latitude -->
          <div class="col-span-6">
            <Label for="latitude">Latitude</Label>
            <Input
              id="latitude"
              v-model="editStatus.latitude"
              type="number"
              step="any"
              :disabled="editStatus.location_origin === 2"
            />
          </div>

          <!-- Longitude -->
          <div class="col-span-6">
            <Label for="longitude">Longitude</Label>
            <Input
              id="longitude"
              v-model="editStatus.longitude"
              type="number"
              step="any"
              :disabled="editStatus.location_origin === 2"
            />
          </div>

          <!-- Location -->
          <div class="col-span-12">
            <Label for="location">Location</Label>
            <Input
              id="location"
              v-model="editStatus.location"
              :disabled="editStatus.location_origin === 2"
            />
          </div>

          <!-- Location Actions -->
          <div class="col-span-4">
            <Button
              type="button"
              variant="outline"
              class="w-full"
              @click="$emit('copy-location')"
            >
              Copy Coordinates
            </Button>
          </div>
          <div class="col-span-4">
            <Button
              type="button"
              variant="outline"
              class="w-full"
              @click="$emit('paste-location')"
            >
              Paste Coordinates
            </Button>
          </div>
          <div class="col-span-4">
            <Button type="button" variant="outline" class="w-full" disabled>
              Open Map
            </Button>
          </div>

          <!-- Location Note -->
          <div class="col-span-12">
            <Label for="locationNote">Location Note</Label>
            <Input
              id="locationNote"
              v-model="editStatus.location_note"
              :disabled="editStatus.location_origin === 1"
            />
          </div>

          <!-- Notes -->
          <div class="col-span-12">
            <Label for="notes">Notes</Label>
            <Input
              id="notes"
              v-model="editStatus.notes"
              maxlength="100"
              placeholder="Add notes (max 100 characters)"
            />
            <div class="flex gap-2 mt-2 flex-wrap">
              <Button
                v-for="note in quickNotes"
                :key="note"
                type="button"
                variant="outline"
                size="sm"
                @click="addQuickNote(note)"
              >
                {{ note }}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" @click="$emit('update:open', false)">
            Cancel
          </Button>
          <Button type="submit" :disabled="disabled" :loading="loading">
            Save Changes
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { OptimizeEditStatus } from '../types/optimize'

defineProps<{
  open: boolean
  editStatus: OptimizeEditStatus
  loading?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submit'): void
  (e: 'copy-location'): void
  (e: 'paste-location'): void
}>()

const quickNotes = ['PTI', 'Fuel', 'Pick up', 'Delivery', 'DOT', 'Break']

const formatDate = (date: any) => {
  return dayjs(date).format('YYYY-MM-DDTHH:mm:ss')
}

const handleDateChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  // Update editStatus.startDate
}

const addQuickNote = (note: string) => {
  // Logic to add quick note
}
</script>
