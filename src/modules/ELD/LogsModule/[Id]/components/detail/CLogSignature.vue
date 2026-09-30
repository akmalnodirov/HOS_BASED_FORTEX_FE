<template>
  <div
    class="w-full h-40 border rounded-lg bg-muted/30 flex items-center justify-center overflow-hidden border-border"
  >
    <img
      v-if="signaturePath"
      :src="signatureImageUrl"
      alt="Signature"
      class="object-contain h-full w-full rounded-lg duration-200 select-none pointer-events-none"
      :style="{ filter: isDarkMode ? 'invert(0.8358)' : '' }"
    />
    <h2 v-else class="font-semibold tracking-wide text-muted-foreground">
      NO SIGNATURE PATH
    </h2>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDarkMode } from '@/composables/useDarkMode.ts'

interface Props {
  signaturePath?: string | null
}

const props = defineProps<Props>()

const { isDarkMode } = useDarkMode()

const baseUrl = import.meta.env.VITE_APP_BASE_URL || ''

const signatureImageUrl = computed(() => {
  if (!props.signaturePath) return ''
  // If signaturePath already includes http, return as is
  if (props.signaturePath.startsWith('http')) {
    return props.signaturePath
  }
  // Otherwise, prepend base URL
  return `${baseUrl}/${props.signaturePath}`
})
</script>
