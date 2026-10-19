<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogContent
      class="sm:max-w-[520px] p-0 gap-0 overflow-hidden"
      @escape-key-down="loading && $event.preventDefault()"
      @interact-outside="loading && $event.preventDefault()"
      @pointer-down-outside="loading && $event.preventDefault()"
    >
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
            :disabled="loading"
            @click="actionType = 'reassign'"
          >
            Reassign
          </Button>
          <Button
            type="button"
            class="flex-1"
            :variant="actionType === 'replicate' ? 'default' : 'outline'"
            :disabled="loading"
            @click="actionType = 'replicate'"
          >
            Replicate
          </Button>
        </div>

        <p class="text-xs text-muted-foreground">
          {{ actionType === 'reassign'
            ? 'Move the events to the target driver. The change is staged until submission.'
            : 'Copy the events to the target driver while keeping them here. The change is staged until submission.' }}
        </p>

        <div class="space-y-1">
          <label class="text-xs font-medium text-muted-foreground">Company</label>
          <Select v-model="companyId" :disabled="driversLoading || loading" @update:model-value="toDriverId = ''">
            <SelectTrigger>
              <SelectValue :placeholder="driversLoading ? 'Loading companies...' : 'Select company'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="company in companies" :key="company.id" :value="company.id">
                {{ company.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-1">
          <label class="text-xs font-medium text-muted-foreground">To Driver</label>
          <Select v-model="toDriverId" :disabled="driversLoading || loading || !companyId">
            <SelectTrigger>
              <SelectValue :placeholder="companyId ? 'Select driver' : 'Select company first'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="driver in companyDrivers" :key="driver.id" :value="driver.id">
                <span>{{ driver.displayName }}</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div class="px-6 py-4 border-t flex items-center justify-end gap-2 bg-white dark:bg-card">
        <Button variant="outline" :disabled="loading" @click="onOpenChange(false)">Cancel</Button>
        <Button
          class="bg-black text-white hover:bg-black/90"
          :disabled="loading || selectedCount === 0 || !companyId || !toDriverId"
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
import { computed, ref, watch } from 'vue'
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
const companyId = ref('')
const actionType = ref<'reassign' | 'replicate'>('reassign')
const companies = computed(() => [...new Map(props.drivers
  .filter((driver) => driver.externalCompanyId)
  .map((driver) => [driver.externalCompanyId, {
    id: driver.externalCompanyId,
    name: driver.externalCompanyName || 'Unnamed company',
  }])).values()].sort((first, second) => first.name.localeCompare(second.name)))
const companyDrivers = computed(() => props.drivers.filter((driver) => driver.externalCompanyId === companyId.value))

watch(
  () => props.open,
  (open) => {
    if (!open) return
    toDriverId.value = ''
    companyId.value = ''
    actionType.value = 'reassign'
  }
)

const handleSubmit = () => {
  if (props.loading || !companyId.value || !toDriverId.value || props.selectedCount === 0) return
  emit('submit', { toDriverId: toDriverId.value, actionType: actionType.value })
}

function onOpenChange(open: boolean) {
  if (!open && props.loading) return
  emit('update:open', open)
}
</script>
