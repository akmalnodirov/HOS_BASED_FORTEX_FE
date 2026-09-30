<script setup lang="ts">
import { MessageCircleOff } from 'lucide-vue-next'
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full text-center p-8">
    <div class="mb-4">
      <MessageCircleOff class="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto" />
    </div>
    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
      No tasks here
    </h3>
    <p class="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
      No tasks assigned yet. Add new ones to keep your team organized.
    </p>
  </div>
</template>
