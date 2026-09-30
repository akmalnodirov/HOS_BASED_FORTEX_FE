<script setup lang="ts">
import { ref } from 'vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const emit = defineEmits<{
  (e: 'send', text: string): void
}>()

const messageText = ref('')

const handleSend = () => {
  if (messageText.value.trim()) {
    emit('send', messageText.value)
    messageText.value = ''
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
}
</script>

<template>
  <div class="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
    <div class="flex items-center gap-3">
      <Input
        v-model="messageText"
        placeholder="Type your message..."
        class="flex-1"
        @keydown="handleKeydown"
      />
      <Button
        v-if="messageText.trim()"
        @click="handleSend"
        class="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
      >
        Send
      </Button>
    </div>
  </div>
</template>
