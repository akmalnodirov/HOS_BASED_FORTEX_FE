<script setup lang="ts">
import { ref, computed } from 'vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export interface Message {
  id: string
  senderId: string
  senderName: string
  senderAvatar: string
  text: string
  timestamp: string
  isMine: boolean
}

interface Props {
  message: Message
}

const props = defineProps<Props>()

const initials = computed(() => {
  return props.message.senderName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})
</script>

<template>
  <div :class="[
    'flex gap-3 mb-4',
    message.isMine ? 'flex-row-reverse' : 'flex-row'
  ]">
    <!-- Avatar -->
    <div v-if="!message.isMine" class="flex-shrink-0">
      <Avatar class="w-10 h-10">
        <AvatarImage :src="message.senderAvatar" :alt="message.senderName" />
        <AvatarFallback>{{ initials }}</AvatarFallback>
      </Avatar>
    </div>

    <!-- Message Content -->
    <div :class="[
      'flex flex-col max-w-[70%]',
      message.isMine ? 'items-end' : 'items-start'
    ]">
      <!-- Sender Name (only for received messages) -->
      <div v-if="!message.isMine" class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
        {{ message.senderName }}
      </div>

      <!-- Message Bubble -->
      <div :class="[
        'px-4 py-2.5 rounded-2xl',
        message.isMine
          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
      ]">
        <p class="text-sm leading-relaxed">{{ message.text }}</p>
      </div>

      <!-- Timestamp -->
      <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {{ message.timestamp }}
      </div>
    </div>

    <!-- Spacer for sent messages -->
    <div v-if="message.isMine" class="flex-shrink-0 w-10"></div>
  </div>
</template>
