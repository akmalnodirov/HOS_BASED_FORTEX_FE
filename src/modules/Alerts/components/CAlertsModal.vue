<template>
  <Dialog :open="open" @update:open="handleClose">
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle class="text-2xl font-semibold">Send an alert</DialogTitle>
      </DialogHeader>

      <div class="mt-4 space-y-6">
        <!-- Chat Area -->
        <div class="bg-gray-50 rounded-lg p-6 min-h-[300px] flex flex-col">
          <div v-if="alertMessages.length === 0" class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <p class="text-gray-500 mb-4">Select driver</p>
              <div
                class="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center mx-auto"
              >
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=driver"
                  alt="Driver avatar"
                  class="w-12 h-12 rounded-full"
                />
              </div>
            </div>
          </div>

          <!-- Messages -->
          <div v-else class="flex-1 space-y-2 overflow-y-auto">
            <div v-for="message in alertMessages" :key="message.id" class="flex justify-end">
              <div class="flex flex-col items-end max-w-xs">
                <div class="bg-gray-900 text-white px-4 py-2 rounded-2xl rounded-tr-sm">
                  {{ message.type }}
                </div>
                <span class="text-xs text-gray-500 mt-1">{{ message.time }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Volume Selection Buttons -->
        <div class="grid grid-cols-5 gap-3">
          <button
            v-for="option in volumeOptions"
            :key="option.type"
            @click="selectVolume(option.type)"
            :class="[
              'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
              selectedVolume === option.type
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 hover:border-gray-300',
            ]"
          >
            <span class="text-sm font-medium text-gray-700">{{ option.type }}</span>
            <div class="flex items-end gap-0.5 h-6">
              <div
                v-for="i in option.bars"
                :key="i"
                :class="[
                  'w-1 bg-gray-900 rounded-sm',
                  i === 1
                    ? 'h-2'
                    : i === 2
                      ? 'h-3'
                      : i === 3
                        ? 'h-4'
                        : i === 4
                          ? 'h-5'
                          : i === 5
                            ? 'h-6'
                            : 'h-6',
                ]"
              />
            </div>
          </button>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <Button type="button" variant="outline" @click="handleClose"> Cancel </Button>
          <Button
            @click="handleSend"
            :disabled="!selectedVolume"
            class="bg-gray-900 hover:bg-gray-800"
          >
            <Bell class="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { Bell } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Alert, AlertMessage, VolumeType } from '@/modules/Alerts/composables/useAlerts.ts'

interface Props {
  open: boolean
  alert?: Alert | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'send', volume: VolumeType): void
}>()

const selectedVolume = ref<VolumeType | null>(null)
const alertMessages = ref<AlertMessage[]>([])

const volumeOptions: { type: VolumeType; bars: number }[] = [
  { type: 'Silent', bars: 2 },
  { type: 'High volume', bars: 3 },
  { type: 'Loud', bars: 4 },
  { type: 'Noisy', bars: 5 },
  { type: 'Thunder', bars: 6 },
]

// Reset when modal opens/closes
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      selectedVolume.value = null
    }
  }
)

const selectVolume = (volume: VolumeType) => {
  selectedVolume.value = volume

  // Add message to chat
  const newMessage: AlertMessage = {
    id: Date.now().toString(),
    type: volume,
    time: new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  }
  alertMessages.value.push(newMessage)
}

const handleSend = () => {
  if (selectedVolume.value) {
    emit('send', selectedVolume.value)
    alertMessages.value = []
    selectedVolume.value = null
  }
}

const handleClose = () => {
  emit('close')
  alertMessages.value = []
}
</script>
