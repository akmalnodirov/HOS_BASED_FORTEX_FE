<template>
  <div class="h-screen flex">
    <!-- Sidebar -->
    <div class="w-80 shrink-0">
      <CChatSidebar
        :contacts="filteredContacts"
        :search-query="searchQuery"
        :active-contact-id="activeContactId"
        @update:search-query="searchQuery = $event"
        @select-contact="selectContact"
      />
    </div>

    <!-- Main Content -->
    <div class="flex-1">
      <CChatConversation v-if="activeContact" :contact="activeContact" />
      <CEmptyState v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import CChatSidebar from '../components/CChatSidebar.vue'
import CChatConversation from '../components/CChatConversation.vue'
import CEmptyState from '../components/CEmptyState.vue'
import { useChat } from '../composables/useChat'

const { searchQuery, activeContactId, filteredContacts, activeContact, selectContact } = useChat()
</script>
