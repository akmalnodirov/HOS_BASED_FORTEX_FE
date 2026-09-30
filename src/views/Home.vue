<template>
  <div class="container mx-auto p-4">
    <h1 class="text-4xl font-bold mb-4">Home Page</h1>
    <p class="text-lg text-muted-foreground mb-4">Welcome to the New ELD App</p>
    <button
      @click="store.increment()"
      class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
    >
      Count is: {{ store.counter }}
    </button>
    <div class="mt-4">
      <router-link to="/about" class="text-primary hover:underline">
        Go to About
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores'

const store = useAppStore()
</script>