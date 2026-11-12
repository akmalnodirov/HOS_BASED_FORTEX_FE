<script setup lang="ts">
import { ref, watch } from 'vue'
import { Check, Palette } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const props = defineProps<{ modelValue: string; disabled?: boolean; label?: string }>()
const emit = defineEmits<{ (event: 'update:modelValue', value: string): void }>()
const draft = ref(props.modelValue)
const colors = [
  '#0ca593',
  '#16a34a',
  '#2563eb',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#4f46e5',
  '#64748b',
  '#111827',
]

watch(
  () => props.modelValue,
  (value) => {
    draft.value = value
  }
)

function choose(value: string) {
  draft.value = value
  emit('update:modelValue', value)
}

function commit() {
  const value = draft.value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(value)) choose(value.toLowerCase())
  else draft.value = props.modelValue
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="outline"
        size="icon"
        :disabled="disabled"
        :title="label || 'Choose color'"
        :aria-label="label || 'Choose color'"
      >
        <span
          class="h-5 w-5 rounded border border-black/10"
          :style="{ backgroundColor: modelValue }"
        />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-64 space-y-3 p-3">
      <div class="flex items-center gap-2 text-xs font-medium">
        <Palette class="h-4 w-4" />{{ label || 'Choose color' }}
      </div>
      <div class="grid grid-cols-6 gap-2">
        <button
          v-for="color in colors"
          :key="color"
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-md border border-black/10"
          :style="{ backgroundColor: color }"
          :title="color"
          :aria-label="`Select ${color}`"
          @click="choose(color)"
        >
          <Check v-if="modelValue.toLowerCase() === color" class="h-4 w-4 text-white drop-shadow" />
        </button>
      </div>
      <label class="grid gap-1 text-xs text-muted-foreground"
        >Custom hex color
        <Input
          v-model="draft"
          maxlength="7"
          placeholder="#0ca593"
          @blur="commit"
          @keydown.enter.prevent="commit"
        />
      </label>
    </PopoverContent>
  </Popover>
</template>
