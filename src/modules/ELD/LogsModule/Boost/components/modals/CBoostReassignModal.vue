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

        <div class="space-y-1">
          <label class="text-xs font-medium text-muted-foreground">To Driver</label>
          <Select v-model="toDriverId" :disabled="driversLoading">
            <SelectTrigger>
              <SelectValue :placeholder="driversLoading ? 'Loading drivers...' : 'Select driver'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="driver in drivers" :key="driver.id" :value="driver.id">
                <span>{{ driver.displayName }}</span>
                <span class="ml-2 text-xs text-muted-foreground">
                  {{ driver.externalCompanyName }}
                </span>
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
          {{
            loading
              ? actionType === 'reassign'
                ? 'Reassigning…'
                : 'Replicating…'
              : actionType === 'reassign'
                ? 'Reassign'
                : 'Replicate'
          }}
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RouteEldDriverOption } from '../../types/boost'

const props = withDefaults(
  defineProps<{
    open: boolean
    selectedCount: number
    loading?: boolean
    drivers: RouteEldDriverOption[]
    driversLoading?: boolean
  }>(),
  {
    loading: false,
    driversLoading: false,
  }
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submit', payload: { toDriverId: string; actionType: 'reassign' | 'replicate' }): void
}>()

const toDriverId = ref('')
const actionType = ref<'reassign' | 'replicate'>('reassign')

watch(
  () => props.open,
  (open) => {
    if (!open) return
    toDriverId.value = ''
    actionType.value = 'reassign'
  }
)

const handleSubmit = () => {
  emit('submit', { toDriverId: toDriverId.value, actionType: actionType.value })
}
</script>
