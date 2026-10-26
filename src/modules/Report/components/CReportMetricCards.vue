<template>
  <div
    class="grid gap-3 shrink-0"
    :class="
      singleRow
        ? 'grid-flow-col auto-cols-[minmax(180px,1fr)] overflow-x-auto'
        : 'grid-cols-2 lg:grid-cols-4'
    "
  >
    <div
      v-for="item in items"
      :key="item.label"
      class="bg-white dark:bg-card border border-border rounded-xl px-4 py-3 flex flex-col gap-1"
    >
      <span class="text-xs text-muted-foreground">{{ item.label }}</span>
      <strong class="font-heading text-xl font-semibold" :class="item.valueClass">
        {{ item.value }}
      </strong>
      <span v-if="item.caption" class="text-[11px] text-muted-foreground">{{ item.caption }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    items: Array<{
      label: string
      value: string | number
      caption?: string
      valueClass?: string
    }>
    singleRow?: boolean
  }>(),
  { singleRow: false }
)
</script>

