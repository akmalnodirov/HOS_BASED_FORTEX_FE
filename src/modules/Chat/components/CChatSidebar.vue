<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Contact } from '../composables/useChat'

interface Props {
  contacts: Contact[]
  searchQuery: string
  activeContactId: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:searchQuery', value: string): void
  (e: 'selectContact', contactId: string): void
}>()

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
  <div class="h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
    <!-- Search -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
        <Input
          :model-value="searchQuery"
          @update:model-value="emit('update:searchQuery', $event)"
          placeholder="Search"
          class="pl-9"
        />
      </div>
    </div>

    <!-- Contact List -->
    <div class="flex-1 overflow-y-auto">
      <div
        v-for="contact in contacts"
        :key="contact.id"
        @click="emit('selectContact', contact.id)"
        :class="[
          'flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800',
          activeContactId === contact.id
            ? 'bg-gray-50 dark:bg-gray-800'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        ]"
      >
        <!-- Avatar -->
        <div class="relative flex-shrink-0">
          <Avatar class="w-12 h-12">
            <AvatarImage :src="contact.avatar" :alt="contact.name" />
            <AvatarFallback>{{ getInitials(contact.name) }}</AvatarFallback>
          </Avatar>
          <!-- Unread badge -->
          <div
            v-if="contact.unread"
            class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"
          ></div>
        </div>

        <!-- Contact Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {{ contact.name }}
            </h3>
            <span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
              {{ contact.timestamp }}
            </span>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 truncate">
            {{ contact.lastMessage }}
          </p>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="contacts.length === 0" class="p-8 text-center">
        <p class="text-sm text-gray-500 dark:text-gray-400">No contacts found</p>
      </div>
    </div>
  </div>
</template>
