<!-- src/components/ui/accordion/AccordionTrigger.vue -->
<script setup lang="ts">
import { AccordionHeader, AccordionTrigger as AccordionTriggerPrimitive } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  hideChevron?: boolean
}>()
</script>

<template>
  <AccordionHeader class="flex">
    <AccordionTriggerPrimitive
      :class="
        cn(
          'flex flex-1 border rounded items-center justify-between py-4 font-medium transition-all',
          props.class
        )
      "
    >
      <slot />
      <!-- Default chevron removed, will use custom icon in component -->
    </AccordionTriggerPrimitive>
  </AccordionHeader>
</template>
