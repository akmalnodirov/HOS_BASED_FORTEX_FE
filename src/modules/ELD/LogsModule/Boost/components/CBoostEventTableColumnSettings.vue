<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button variant="outline" size="icon" class="h-9 w-9" title="Event table columns">
        <Settings2 class="h-4 w-4" />
      </Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Event table columns</DialogTitle>
        <DialogDescription>Choose the columns shown in this Boost tab. Seq ID and time stay visible.</DialogDescription>
      </DialogHeader>
      <div class="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2.5">
        <span class="text-sm font-medium">{{ visibleCount }} of {{ options.length }} visible</span>
        <Button variant="outline" size="sm" :disabled="visibleCount === options.length" @click="$emit('show-all')">Show all</Button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <label v-for="option in options" :key="option.id" class="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm">
          <Checkbox
            :model-value="modelValue[option.id]"
            @update:model-value="$emit('toggle', option.id, $event === true)"
          />
          {{ option.label }}
        </label>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Settings2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { BoostEventTableColumn, BoostEventTableColumnOption, BoostEventTableColumnVisibility } from '../composables/useBoostEventTableColumns'

const props = defineProps<{ options: BoostEventTableColumnOption[]; modelValue: BoostEventTableColumnVisibility }>()
defineEmits<{
  toggle: [column: BoostEventTableColumn, visible: boolean]
  'show-all': []
}>()
const open = ref(false)
const visibleCount = computed(() => props.options.filter((option) => props.modelValue[option.id]).length)
</script>
