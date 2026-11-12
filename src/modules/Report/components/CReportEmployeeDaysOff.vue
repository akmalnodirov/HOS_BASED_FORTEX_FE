<script setup lang="ts">
const props = defineProps<{ modelValue: number[]; disabled?: boolean }>()
const emit = defineEmits<{ (event: 'update:modelValue', value: number[]): void }>()
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toggle(day: number) {
  if (props.disabled) return
  emit('update:modelValue', props.modelValue.includes(day)
    ? props.modelValue.filter((value) => value !== day)
    : [...props.modelValue, day].sort((a, b) => a - b))
}
</script>

<template>
  <div class="flex flex-wrap gap-1">
    <button
      v-for="(name, index) in days"
      :key="name"
      type="button"
      :disabled="disabled"
      :aria-pressed="modelValue.includes(index)"
      class="rounded border px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      :class="modelValue.includes(index)
        ? 'border-red-200 bg-red-100 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300'
        : 'border-border bg-background text-muted-foreground hover:bg-muted'"
      @click="toggle(index)"
    >{{ name }}</button>
  </div>
</template>
