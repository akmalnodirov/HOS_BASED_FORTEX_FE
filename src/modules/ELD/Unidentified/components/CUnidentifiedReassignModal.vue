<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import type { DriverItem } from '@/composables/useCompaniesDrivers'

interface Props {
  open: boolean
  drivers: DriverItem[]
  selectedDriver: string | null
  searchQuery: string
  loading?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'update:searchQuery', value: string): void
  (e: 'select-driver', driverId: string): void
  (e: 'submit'): void
}>()

const close = () => {
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[440px]">
      <DialogHeader>
        <DialogTitle>Reassign logs to the driver</DialogTitle>
      </DialogHeader>
      <Separator />
      <div class="space-y-2">
        <Input
          :model-value="searchQuery"
          @update:model-value="emit('update:searchQuery', $event as string)"
          placeholder="Select Driver"
        />
        <ul
          v-if="drivers.length"
          class="border max-h-60 overflow-y-auto rounded-lg border-border"
        >
          <li
            v-for="driver in drivers"
            :key="driver.id"
            class="border-b border-border last:border-b-0 py-2 px-4 cursor-pointer flex items-center justify-between hover:bg-muted/50 transition-colors"
            :class="{ 'bg-primary/10': selectedDriver === driver.id }"
            @click="emit('select-driver', driver.id)"
          >
            {{ driver.name }}
            <Check v-if="selectedDriver === driver.id" class="w-4 h-4 text-primary" />
          </li>
        </ul>
        <div
          v-else
          class="border rounded-lg py-2 px-4 flex items-center justify-center min-h-40 font-bold uppercase text-muted-foreground"
        >
          No data
        </div>
      </div>
      <Separator />
      <div class="flex items-center justify-end gap-x-3">
        <Button variant="outline" @click="close">Cancel</Button>
        <Button
          :loading="loading"
          :disabled="loading || !selectedDriver"
          @click="emit('submit')"
        >
          Send
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
