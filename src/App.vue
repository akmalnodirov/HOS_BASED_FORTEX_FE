<template>
  <RouterView />
  <Toaster />
</template>
<!-- Example usage in App.vue or router view -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { Toaster } from '@/components/ui/sonner'
import { useDarkMode } from '@/composables/useDarkMode'
import 'vue-sonner/style.css'
import '@/assets/toast-styles.css'

const { initDarkMode } = useDarkMode()

// Initialize dark mode when app starts
onMounted(() => {
  initDarkMode()
})
</script>
