<!-- src/Layouts/Initial/PIndex.vue -->
<script setup lang="ts">
import Header from './components/Header.vue'
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-background">
    <!-- Header -->
    <Header />

    <!-- Main Content -->
    <main class="p-6 !pb-0">
      <router-view />
    </main>
  </div>
</template>
