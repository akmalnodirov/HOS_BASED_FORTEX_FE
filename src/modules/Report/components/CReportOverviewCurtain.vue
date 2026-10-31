<script setup lang="ts">
import { ref, useId } from 'vue'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'

const expanded = ref(false)
const contentId = useId()
</script>

<template>
  <section class="shrink-0" aria-label="Summary and filters">
    <div
      :id="contentId"
      class="grid transition-[grid-template-rows,opacity] duration-300 ease-in-out"
      :class="expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
      :inert="!expanded"
      :aria-hidden="!expanded"
    >
      <div class="min-h-0 overflow-hidden">
        <div class="flex flex-col gap-1">
          <slot />
        </div>
      </div>
    </div>
    <div class="relative flex h-6 items-center justify-center">
      <div class="absolute inset-x-0 border-t border-border" />
      <button
        type="button"
        class="relative z-10 flex h-6 w-10 items-center justify-center rounded-md border border-border bg-gray-50 text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:bg-background"
        :aria-controls="contentId"
        :aria-expanded="expanded"
        :aria-label="expanded ? 'Hide summary and filters' : 'Show summary and filters'"
        :title="expanded ? 'Hide summary and filters' : 'Show summary and filters'"
        @click="expanded = !expanded"
      >
        <ChevronUp v-if="expanded" class="h-4 w-4" />
        <ChevronDown v-else class="h-4 w-4" />
      </button>
    </div>
  </section>
</template>
