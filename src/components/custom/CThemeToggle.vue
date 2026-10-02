<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useDarkMode } from '@/composables/useDarkMode'

const { isDarkMode, toggleDarkMode } = useDarkMode()
</script>

<template>
  <Button
    type="button"
    variant="outline"
    size="icon"
    class="h-10 w-10 cursor-pointer rounded-full bg-background/90 shadow-sm backdrop-blur transition-colors"
    :aria-label="isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'"
    :title="isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'"
    @click="toggleDarkMode"
  >
    <Sun v-if="isDarkMode" class="h-[18px] w-[18px]" />
    <Moon v-else class="h-[18px] w-[18px]" />
  </Button>
</template>
