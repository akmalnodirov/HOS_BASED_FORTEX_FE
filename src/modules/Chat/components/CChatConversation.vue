<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Phone } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import CMessageBubble from './CMessageBubble.vue'
import CChatInput from './CChatInput.vue'
import type { Contact } from '../composables/useChat'
import { useMessages } from '../composables/useMessages'

interface Props {
  contact: Contact
}

const props = defineProps<Props>()

const messagesContainer = ref<HTMLElement | null>(null)

const { groupedMessages, sendMessage } = useMessages(props.contact.id)

const handleSend = (text: string) => {
  sendMessage(text)
  // Scroll to bottom after sending
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Scroll to bottom on mount and when contact changes
watch(
  () => props.contact.id,
  () => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })
  },
  { immediate: true }
)

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
</script>

<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-3">
        <Avatar class="w-10 h-10">
          <AvatarImage :src="contact.avatar" :alt="contact.name" />
          <AvatarFallback>{{ getInitials(contact.name) }}</AvatarFallback>
        </Avatar>
        <div>
          <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {{ contact.name }}
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ contact.timestamp }}</p>
        </div>
      </div>

      <!-- Call Button -->
      <Button
        variant="ghost"
        size="icon"
        class="rounded-full bg-blue-500 hover:bg-blue-600 text-white"
      >
        <Phone class="w-4 h-4" />
      </Button>
    </div>

    <!-- Messages -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4">
      <div v-for="group in groupedMessages" :key="group.date" class="mb-6">
        <!-- Date Separator -->
        <div class="flex items-center justify-center mb-4">
          <div class="px-3 py-1 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700">
            <span class="text-xs text-gray-600 dark:text-gray-400">{{ group.date }}</span>
          </div>
        </div>

        <!-- Messages -->
        <div v-for="message in group.messages" :key="message.id">
          <CMessageBubble :message="message" />
        </div>
      </div>
    </div>

    <!-- Input -->
    <CChatInput @send="handleSend" />
  </div>
</template>
