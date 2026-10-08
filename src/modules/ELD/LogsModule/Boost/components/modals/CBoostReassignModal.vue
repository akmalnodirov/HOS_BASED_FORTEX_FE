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
          <label class="text-xs font-medium text-muted-foreground">Company</label>
          <Select v-model="selectedCompanyId" @update:model-value="onCompanyChange">
            <SelectTrigger :disabled="isCompaniesLoading">
              <SelectValue :placeholder="isCompaniesLoading ? 'Loading companies...' : 'Select company'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="company in companies"
                :key="company.id"
                :value="company.id"
              >
                {{ company.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-1">
          <label class="text-xs font-medium text-muted-foreground">To Driver</label>
          <Select v-model="toDriverId" :disabled="!selectedCompanyId || isDriversLoading">
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
import { useCompaniesDrivers } from '@/composables/useCompaniesDrivers'

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

const { companies, drivers, fetchCompanies, fetchDrivers } = useCompaniesDrivers()

const toDriverId = ref('')
const selectedCompanyId = ref('')
const actionType = ref<'reassign' | 'replicate'>('reassign')
const isCompaniesLoading = ref(false)
const isDriversLoading = ref(false)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    toDriverId.value = ''
    selectedCompanyId.value = ''
    actionType.value = 'reassign'
    isCompaniesLoading.value = true
    try {
      await fetchCompanies()
    } finally {
      isCompaniesLoading.value = false
    }
  }
)

async function onCompanyChange(companyId: string) {
  toDriverId.value = ''
  isDriversLoading.value = true
  try {
    await fetchDrivers(companyId)
  } finally {
    isDriversLoading.value = false
  }
}

const handleSubmit = () => {
  emit('submit', { toDriverId: toDriverId.value, actionType: actionType.value })
}
</script>
