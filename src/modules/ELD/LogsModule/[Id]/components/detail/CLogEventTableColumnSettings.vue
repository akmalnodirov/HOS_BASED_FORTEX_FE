<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button
        variant="outline"
        size="icon"
        class="h-9 w-9 shrink-0"
        title="Event table columns"
        aria-label="Configure event table columns"
      >
        <Settings2 class="h-4 w-4" />
      </Button>
    </DialogTrigger>

    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Event table columns</DialogTitle>
        <DialogDescription>
          Choose which columns are visible in the event table. Seq. ID and time always remain
          visible.
        </DialogDescription>
      </DialogHeader>

      <div
        class="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2.5"
      >
        <div>
          <div class="text-sm font-medium text-foreground">Visible columns</div>
          <div class="text-xs text-muted-foreground">
            {{ visibleCount }} of {{ options.length }}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          class="h-8 text-xs"
          :disabled="allVisible"
          @click="emit('show-all')"
        >
          Show all
        </Button>
      </div>

      <div class="grid gap-2 sm:grid-cols-2">
        <label
          v-for="option in options"
          :key="option.id"
          class="flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
        >
          <Checkbox
            :model-value="modelValue[option.id]"
            @update:model-value="(value) => emit('toggle', option.id, value === true)"
          />
          <span>{{ option.label }}</span>
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type {
  LogEventTableColumn,
  LogEventTableColumnOption,
  LogEventTableColumnVisibility,
} from '../../composables/useLogEventTableColumns'

const props = defineProps<{
  options: LogEventTableColumnOption[]
  modelValue: LogEventTableColumnVisibility
}>()

const emit = defineEmits<{
  (event: 'toggle', column: LogEventTableColumn, visible: boolean): void
  (event: 'show-all'): void
}>()

const open = ref(false)
const visibleCount = computed(
  () => props.options.filter((option) => props.modelValue[option.id]).length
)
const allVisible = computed(() => visibleCount.value === props.options.length)
</script>
