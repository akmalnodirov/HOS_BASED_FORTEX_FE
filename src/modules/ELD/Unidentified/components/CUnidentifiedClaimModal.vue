<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { EventDefinition } from '@/utils/events'

interface Props {
  open: boolean
  events: EventDefinition[]
  selectedStatus: string | null
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'update:selectedStatus', value: string): void
  (e: 'submit'): void
}>()

const close = () => {
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>Select the type of driving status to claim</DialogTitle>
      </DialogHeader>
      <Separator />
      <div class="space-y-3">
        <RadioGroup
          :model-value="selectedStatus ?? undefined"
          @update:model-value="emit('update:selectedStatus', $event as string)"
          class="flex flex-col gap-3"
        >
          <div
            v-for="event in events"
            :key="event.key"
            :class="[
              'flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors',
              selectedStatus === event.key
                ? 'border-primary/50 bg-primary/5'
                : 'border-border hover:border-primary/30',
            ]"
            @click="emit('update:selectedStatus', event.key)"
          >
            <RadioGroupItem :value="event.key" :id="event.key" />
            <Label :for="event.key" class="text-sm font-medium flex-1 cursor-pointer">
              {{ event.label }}
            </Label>
          </div>
        </RadioGroup>
      </div>
      <Separator />
      <DialogFooter class="flex items-center gap-3 sm:justify-end">
        <Button variant="outline" @click="close">Cancel</Button>
        <Button :disabled="!selectedStatus || loading" :loading="loading" @click="emit('submit')">
          Done
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
