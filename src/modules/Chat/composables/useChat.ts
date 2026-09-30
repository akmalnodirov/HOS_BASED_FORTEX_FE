/**
 * Composable for managing chat state and contacts
 */

import { ref, computed } from 'vue'

export interface Contact {
  id: string
  name: string
  avatar: string
  lastMessage: string
  timestamp: string
  unread: boolean
  online?: boolean
}

export function useChat() {
  // Mock contacts data
  const contacts = ref<Contact[]>([
    {
      id: '1',
      name: 'Rano shodieva',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rano',
      lastMessage: 'Lorem ipsum dolor sit amet sdf asipisb',
      timestamp: '10:00 AM',
      unread: true,
      online: true,
    },
    {
      id: '2',
      name: 'Temur Joraev',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Temur',
      lastMessage: 'Hello everyone! I\'ve been working on the landing page...',
      timestamp: '11:11 AM',
      unread: false,
      online: true,
    },
    {
      id: '3',
      name: 'Aziza Karimova',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aziza',
      lastMessage: 'Great work on the project!',
      timestamp: '9:45 AM',
      unread: false,
    },
    {
      id: '4',
      name: 'Bobur Aliev',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bobur',
      lastMessage: 'Can we schedule a meeting?',
      timestamp: '8:30 AM',
      unread: true,
    },
    {
      id: '5',
      name: 'Dilnoza Raximova',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dilnoza',
      lastMessage: 'Thanks for your help!',
      timestamp: 'Yesterday',
      unread: false,
    },
  ])

  const searchQuery = ref('')
  const activeContactId = ref<string | null>(null)

  // Computed - Filtered contacts
  const filteredContacts = computed(() => {
    if (!searchQuery.value) return contacts.value

    const search = searchQuery.value.toLowerCase()
    return contacts.value.filter(
      (contact) =>
        contact.name.toLowerCase().includes(search) ||
        contact.lastMessage.toLowerCase().includes(search)
    )
  })

  // Computed - Active contact
  const activeContact = computed(() => {
    if (!activeContactId.value) return null
    return contacts.value.find((c) => c.id === activeContactId.value) || null
  })

  // Methods
  const selectContact = (contactId: string) => {
    activeContactId.value = contactId
    // Mark as read
    const contact = contacts.value.find((c) => c.id === contactId)
    if (contact) {
      contact.unread = false
    }
  }

  const clearActiveContact = () => {
    activeContactId.value = null
  }

  return {
    contacts,
    searchQuery,
    activeContactId,
    filteredContacts,
    activeContact,
    selectContact,
    clearActiveContact,
  }
}
