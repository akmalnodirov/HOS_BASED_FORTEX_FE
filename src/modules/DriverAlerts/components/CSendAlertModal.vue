<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Bell, LoaderCircle, Search, UserRound } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/custom/modal'
import {
  ALERT_SOUNDS,
  useAlertSoundPreview,
} from '@/modules/DriverAlerts/composables/useAlertSoundPreview'
import type { AlertDriver, AlertMusicType, AlertSound } from '@/modules/DriverAlerts/types'

interface Props {
  open: boolean
  driver: AlertDriver | null
  drivers: AlertDriver[]
  isSending: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (event: 'close'): void
  (event: 'send', payload: { driver: AlertDriver; musicType: AlertMusicType }): void
}>()

const { play, stop } = useAlertSoundPreview()

const selectedDriver = ref<AlertDriver | null>(null)
const selectedSound = ref<AlertMusicType | null>(null)
const isPicking = ref(false)
const driverSearch = ref('')

const pickerDrivers = computed(() => {
  const search = driverSearch.value.trim().toLowerCase()
  if (!search) return props.drivers
  return props.drivers.filter(
    (driver) =>
      driver.name.toLowerCase().includes(search) || driver.unit.toLowerCase().includes(search)
  )
})

const canSend = computed(
  () =>
    !!selectedDriver.value && !isPicking.value && selectedSound.value !== null && !props.isSending
)

const initials = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      stop()
      return
    }
    selectedDriver.value = props.driver
    selectedSound.value = null
    isPicking.value = !props.driver
    driverSearch.value = ''
  },
  { immediate: true }
)

const selectDriver = (driver: AlertDriver) => {
  selectedDriver.value = driver
  isPicking.value = false
  driverSearch.value = ''
}

const startPicking = () => {
  if (props.isSending) return
  isPicking.value = true
}

const selectSound = (sound: AlertSound) => {
  selectedSound.value = sound.type
  play(sound)
}

const handleClose = () => {
  if (props.isSending) return
  stop()
  emit('close')
}

const handleSend = () => {
  if (!canSend.value || !selectedDriver.value || selectedSound.value === null) return
  stop()
  emit('send', { driver: selectedDriver.value, musicType: selectedSound.value })
}
</script>

<template>
  <Modal :open="open" @update:open="(value: boolean) => !value && handleClose()">
    <ModalContent class="max-w-[480px]">
      <ModalHeader>
        <ModalTitle class="text-2xl font-semibold">Send an alert</ModalTitle>
      </ModalHeader>

      <form class="space-y-5" @submit.prevent="handleSend">
        <div class="rounded-lg bg-muted/50 p-4 dark:bg-muted/30">
          <div
            v-if="!isPicking && selectedDriver"
            class="flex min-h-[160px] flex-col items-center justify-center gap-3 text-center"
          >
            <Avatar class="h-12 w-12 bg-background shadow-sm">
              <AvatarFallback class="font-semibold">
                {{ initials(selectedDriver.name) || '?' }}
              </AvatarFallback>
            </Avatar>
            <div>
              <p class="font-medium text-foreground">{{ selectedDriver.name }}</p>
              <p v-if="selectedDriver.unit" class="text-xs text-muted-foreground">
                Unit {{ selectedDriver.unit }}
              </p>
            </div>
            <Button
              type="button"
              variant="link"
              size="sm"
              class="h-auto p-0 text-xs"
              :disabled="isSending"
              @click="startPicking"
            >
              Change driver
            </Button>
          </div>

          <div v-else class="space-y-3">
            <div class="flex flex-col items-center gap-2 text-center">
              <p class="text-sm text-muted-foreground">Select driver</p>
              <Avatar class="h-12 w-12 bg-background shadow-sm">
                <AvatarFallback>
                  <UserRound class="h-6 w-6 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
            </div>
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                v-model="driverSearch"
                placeholder="Search driver"
                aria-label="Search driver"
                class="bg-background pl-9"
              />
            </div>
            <div class="max-h-44 overflow-y-auto rounded-md border border-border bg-background">
              <button
                v-for="option in pickerDrivers"
                :key="option.id"
                type="button"
                class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                @click="selectDriver(option)"
              >
                <span class="truncate">{{ option.name }}</span>
                <span class="shrink-0 text-xs text-muted-foreground">{{ option.unit }}</span>
              </button>
              <p
                v-if="pickerDrivers.length === 0"
                class="px-3 py-4 text-center text-sm text-muted-foreground"
              >
                No drivers found
              </p>
            </div>
          </div>
        </div>

        <div role="radiogroup" aria-label="Alert sound" class="grid grid-cols-5 gap-2">
          <button
            v-for="sound in ALERT_SOUNDS"
            :key="sound.type"
            type="button"
            role="radio"
            :aria-checked="selectedSound === sound.type"
            :disabled="isSending"
            :class="[
              'flex min-h-[72px] flex-col items-center justify-between gap-2 rounded-md border px-1 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
              selectedSound === sound.type
                ? 'border-primary bg-primary/5 text-foreground dark:bg-primary/15'
                : 'border-border text-foreground hover:bg-muted',
            ]"
            @click="selectSound(sound)"
          >
            <span class="text-center leading-tight">{{ sound.label }}</span>
            <span class="flex h-4 items-end gap-[2px]" aria-hidden="true">
              <span
                v-for="bar in sound.bars"
                :key="bar"
                class="w-[3px] rounded-[1px] bg-current"
                :style="{ height: `${4 + bar * 2}px` }"
              />
            </span>
          </button>
        </div>

        <div class="flex justify-end gap-3">
          <Button type="button" variant="outline" :disabled="isSending" @click="handleClose">
            Cancel
          </Button>
          <Button type="submit" :disabled="!canSend">
            <LoaderCircle v-if="isSending" class="h-4 w-4 animate-spin" />
            <Bell v-else class="h-4 w-4" />
            Send
          </Button>
        </div>
      </form>
    </ModalContent>
  </Modal>
</template>
