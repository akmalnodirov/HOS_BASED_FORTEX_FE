/**
 * Composable for managing messages
 */

import { ref, computed } from 'vue'

export interface Message {
  id: string
  senderId: string
  senderName: string
  senderAvatar: string
  text: string
  timestamp: string
  date: string
  isMine: boolean
}

export function useMessages(contactId: string | null) {
  // Mock messages data
  const allMessages = ref<Record<string, Message[]>>({
    '1': [
      {
        id: 'm1',
        senderId: '1',
        senderName: 'Rano shodieva',
        senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rano',
        text: 'Hello everyone! I\'ve been working on the landing page, please check it out and don\'t forget to leave a feedback before 10th night!',
        timestamp: '10:00 AM',
        date: 'Today, 12 February',
        isMine: false,
      },
      {
        id: 'm2',
        senderId: 'me',
        senderName: 'Me',
        senderAvatar: '',
        text: 'Good job, Uchita! No comments from me, everything looks on point!',
        timestamp: '10:05 AM',
        date: 'Today, 12 February',
        isMine: true,
      },
      {
        id: 'm3',
        senderId: 'me',
        senderName: 'Me',
        senderAvatar: '',
        text: 'Maybe from others there is a feedback?',
        timestamp: '10:05 AM',
        date: 'Today, 12 February',
        isMine: true,
      },
      {
        id: 'm4',
        senderId: '1',
        senderName: 'Rano shodieva',
        senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rano',
        text: 'I think there is something missing in the about us section, it looks stiff! Can you make another option?',
        timestamp: '10:11 AM',
        date: 'Today, 12 February',
        isMine: false,
      },
      {
        id: 'm5',
        senderId: '1',
        senderName: 'Rano shodieva',
        senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rano',
        text: 'Naruto: Hahaha, I agree with you. Maybe we can make it better and better!',
        timestamp: '10:13 AM',
        date: 'Today, 12 February',
        isMine: false,
      },
    ],
    '2': [
      {
        id: 'm1',
        senderId: '2',
        senderName: 'Temur Joraev',
        senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Temur',
        text: 'Hello everyone! I\'ve been working on the landing page, please check it out and don\'t forget to leave a feedback before 10th night!',
        timestamp: '10:00 AM',
        date: 'Today, 12 February',
        isMine: false,
      },
      {
        id: 'm2',
        senderId: 'me',
        senderName: 'Me',
        senderAvatar: '',
        text: 'Good job, Uchita! No comments from me, everything looks on point!',
        timestamp: '10:05 AM',
        date: 'Today, 12 February',
        isMine: true,
      },
      {
        id: 'm3',
        senderId: 'me',
        senderName: 'Me',
        senderAvatar: '',
        text: 'Maybe from others there is a feedback?',
        timestamp: '10:05 AM',
        date: 'Today, 12 February',
        isMine: true,
      },
      {
        id: 'm4',
        senderId: '2',
        senderName: 'Temur Joraev',
        senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Temur',
        text: 'I think there is something missing in the about us section, it looks stiff! Can you make another option?',
        timestamp: '10:11 AM',
        date: 'Today, 12 February',
        isMine: false,
      },
      {
        id: 'm5',
        senderId: '2',
        senderName: 'Temur Joraev',
        senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Temur',
        text: 'Naruto: Hahaha, I agree with you. Maybe we can make it better and better!',
        timestamp: '10:13 AM',
        date: 'Today, 12 February',
        isMine: false,
      },
    ],
  })

  const messages = computed(() => {
    if (!contactId) return []
    return allMessages.value[contactId] || []
  })

  // Group messages by date
  const groupedMessages = computed(() => {
    const groups: { date: string; messages: Message[] }[] = []
    let currentDate = ''

    messages.value.forEach((message) => {
      if (message.date !== currentDate) {
        currentDate = message.date
        groups.push({ date: currentDate, messages: [message] })
      } else {
        groups[groups.length - 1].messages.push(message)
      }
    })

    return groups
  })

  const sendMessage = (text: string) => {
    if (!contactId || !text.trim()) return

    const newMessage: Message = {
      id: `m${Date.now()}`,
      senderId: 'me',
      senderName: 'Me',
      senderAvatar: '',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      date: 'Today, 12 February',
      isMine: true,
    }

    if (!allMessages.value[contactId]) {
      allMessages.value[contactId] = []
    }

    allMessages.value[contactId].push(newMessage)
  }

  return {
    messages,
    groupedMessages,
    sendMessage,
  }
}
