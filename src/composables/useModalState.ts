// Composable for modal state management
// Single Responsibility: Only handles modal open/close state

import { ref } from 'vue'

export interface UseModalStateOptions<T> {
  onOpen?: (item?: T) => void
  onClose?: () => void
}

export function useModalState<T = any>(options: UseModalStateOptions<T> = {}) {
  const { onOpen, onClose } = options

  const isOpen = ref(false)
  const selectedItem = ref<T | null>(null)

  const open = (item?: T) => {
    if (item) {
      selectedItem.value = { ...item } as T
    }
    isOpen.value = true
    onOpen?.(item)
  }

  const close = () => {
    isOpen.value = false
    selectedItem.value = null
    onClose?.()
  }

  return {
    isOpen,
    selectedItem,
    open,
    close,
  }
}
