<template>
  <div class="container mx-auto p-4">
    <h1 class="text-4xl font-bold mb-4">About Page</h1>
    <p class="text-lg text-muted-foreground mb-4">
      This is a Vue 3 + TypeScript + Vite project with:
    </p>
    <ul class="list-disc list-inside space-y-2 mb-4">
      <li>Pinia for state management</li>
      <li>Vue Router for navigation</li>
      <li>Axios for HTTP requests</li>
      <li>Tailwind CSS for styling</li>
      <li>shadcn-vue for UI components</li>
      <li>ESLint for code quality</li>
    </ul>
    <div class="mt-4">
      <router-link to="/" class="text-primary hover:underline">
        Go back to Home
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>