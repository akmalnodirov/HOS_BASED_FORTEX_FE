<template>
  <div v-if="item.kind === RouteEldAssistantItemKind.User && item.text" class="flex justify-end">
    <div
      class="max-w-[85%] whitespace-pre-wrap break-words rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
    >
      {{ item.text }}
    </div>
  </div>
  <div
    v-else-if="item.kind === RouteEldAssistantItemKind.Assistant && item.text"
    class="flex justify-start"
  >
    <div class="max-w-[85%] whitespace-pre-wrap break-words rounded-lg bg-muted px-3 py-2 text-sm">
      {{ item.text }}
    </div>
  </div>
  <p
    v-else-if="item.kind === RouteEldAssistantItemKind.Action && item.action?.summary"
    class="whitespace-pre-wrap break-words text-xs text-muted-foreground"
  >
    {{ item.action.summary }}
  </p>
</template>

<script setup lang="ts">
import { RouteEldAssistantItemKind, type RouteEldAssistantItem } from '../../types/assistant'

defineProps<{
  item: RouteEldAssistantItem
}>()
</script>
