<template>
  <div
    class="absolute bottom-full z-50 mb-3 min-w-[240px] max-w-[290px] cursor-default rounded-lg border border-border bg-card text-foreground shadow-xl"
    :class="
      placement === 'left'
        ? 'right-0'
        : placement === 'right'
          ? 'left-0'
          : 'left-1/2 -translate-x-1/2'
    "
    @click.stop
  >
    <div class="space-y-2 px-4 py-3 text-xs">
      <button
        type="button"
        title="Close"
        aria-label="Close marker details"
        class="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        @click.stop="emit('close')"
      >
        <X class="h-4 w-4" />
      </button>
      <div class="border-b border-border pb-2 pr-6 text-sm font-semibold">{{ title }}</div>
      <div v-for="row in rows" :key="row.label" class="flex justify-between gap-4">
        <span class="shrink-0 text-muted-foreground">{{ row.label }}</span>
        <span class="max-w-[165px] break-words text-right">{{ row.value || '—' }}</span>
      </div>
    </div>
    <div
      class="absolute -bottom-2 h-0 w-0 border-[8px] border-transparent border-t-card"
      :class="
        placement === 'left'
          ? 'right-2'
          : placement === 'right'
            ? 'left-2'
            : 'left-1/2 -translate-x-1/2'
      "
    />
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    title: string
    rows: { label: string; value: string | number | null | undefined }[]
    placement?: 'left' | 'right' | 'center'
  }>(),
  { placement: 'center' }
)
const emit = defineEmits<{ (event: 'close'): void }>()
</script>
