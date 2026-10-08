<template>
  <div class="flex items-center flex-col gap-1">
    <div class="flex items-center justify-between bg-white dark:bg-card w-full py-4 px-6">
      <div class="flex items-center gap-2 flex-wrap">
        <div v-if="tabs.length > 0" class="flex items-center gap-1 flex-wrap">
          <button
            v-for="(tab, i) in tabs"
            :key="tab.id"
            class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors"
            :class="
              selectedTab?.id === tab.id
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-border hover:bg-muted'
            "
            @click="$emit('select-tab', tab)"
          >
            <span>{{ tab.name }}</span>
            <span
              v-if="i === tabs.length - 1 && tabs.length > 1"
              class="ml-0.5 rounded p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
              @click.stop="requestRemoveTab(tab.id)"
            >
              <X class="w-2.5 h-2.5" />
            </span>
          </button>

          <button
            class="flex items-center justify-center w-7 h-7 rounded-md border border-border bg-background hover:bg-muted transition-colors"
            @click="$emit('new-click')"
          >
            <Plus class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          :class="[
            'h-9 px-6 text-xs',
            isSubmitted
              ? 'border-amber-500 text-amber-600 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30'
              : 'bg-background',
          ]"
          :disabled="submitDisabled || submitLoading"
          @click="$emit('submit-click')"
        >
          <span v-if="submitLoading" class="flex items-center gap-1.5">
            <span class="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {{ isSubmitted ? 'Rolling back...' : 'Submitting...' }}
          </span>
          <span v-else>{{ isSubmitted ? 'Rollback' : 'Submit' }}</span>
        </Button>
      </div>
    </div>

    <div class="flex items-center justify-between bg-white dark:bg-card w-full py-4 px-6">
      <Button
        variant="outline"
        size="sm"
        class="h-9 px-4 text-xs border-[#AF4B4B] text-[#AF4B4B] hover:bg-[#E74C3C]/10 hover:text-[#AF4B4B/20] disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="!hasErrorWarning"
        @click="$emit('error-warning-click')"
      >
        <span>Error/Warning</span>
      </Button>

      <div v-if="freeTimes.length" class="flex items-center gap-1">
        <Button variant="ghost" size="sm" class="h-8 w-8 p-0" @click="scrollLeft">
          <ChevronLeft class="w-4 h-4" />
        </Button>

        <div ref="freeTimesContainer" class="max-w-112.5 overflow-hidden">
          <div
            ref="freeTimesContent"
            class="flex items-center gap-2 transition-transform duration-300"
            :style="{ transform: `translateX(-${scrollOffset}px)` }"
          >
            <button
              v-for="(freeTime, index) in freeTimes"
              :key="freeTime.eventId || index"
              class="shrink-0 px-4 py-1.5 bg-[#f8f9fd] dark:bg-muted border-[#d6e1ff] dark:border-border border rounded-md text-xs font-medium text-[#090909] dark:text-foreground hover:bg-[#e8ecfa] dark:hover:bg-muted/80 hover:border-[#b8c8ff] dark:hover:border-border transition-colors cursor-pointer"
              @click="handleFreeTimeClick(freeTime)"
            >
              {{ formatHHMM(freeTime.freeDurationInSeconds) }}
            </button>
          </div>
        </div>

        <Button variant="ghost" size="sm" class="h-8 w-8 p-0" @click="scrollRight">
          <ChevronRight class="w-4 h-4" />
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        class="h-9 px-4 text-xs border-[#AF4B4B] text-[#AF4B4B] hover:bg-[#AF4B4B]/10 hover:text-[#AF4B4B/20]"
        @click="$emit('violation-click')"
      >
        <span>Violation</span>
      </Button>
    </div>

    <Dialog v-model:open="showDeleteConfirm">
      <DialogContent class="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Delete Tab</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this tab? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showDeleteConfirm = false">Cancel</Button>
          <Button variant="destructive" @click="confirmRemoveTab">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Plus, ChevronLeft, ChevronRight, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { BoostFreeTime } from '@/modules/ELD/LogsModule/[Id]/types/chart.ts'
import type { TabResponse } from '../types/boost.ts'

const props = withDefaults(
  defineProps<{
    submitDisabled?: boolean
    submitLoading?: boolean
    isSubmitted?: boolean
    freeTimes?: BoostFreeTime[]
    tabs?: TabResponse[]
    selectedTab?: TabResponse | null
    hasErrorWarning?: boolean
  }>(),
  {
    submitDisabled: false,
    submitLoading: false,
    isSubmitted: false,
    freeTimes: () => [],
    tabs: () => [],
    selectedTab: null,
    hasErrorWarning: false,
  }
)

const emit = defineEmits<{
  (e: 'initial-click'): void
  (e: 'new-click'): void
  (e: 'submit-click'): void
  (e: 'error-warning-click'): void
  (e: 'violation-click'): void
  (e: 'free-time-click', freeTime: BoostFreeTime): void
  (e: 'select-tab', tab: TabResponse): void
  (e: 'remove-tab', tabId: string): void
}>()

const handleFreeTimeClick = (freeTime: BoostFreeTime) => {
  emit('free-time-click', freeTime)
}

const showDeleteConfirm = ref(false)
const pendingRemoveTabId = ref<string | null>(null)

const requestRemoveTab = (tabId: string) => {
  pendingRemoveTabId.value = tabId
  showDeleteConfirm.value = true
}

const confirmRemoveTab = () => {
  if (pendingRemoveTabId.value) {
    emit('remove-tab', pendingRemoveTabId.value)
  }
  showDeleteConfirm.value = false
  pendingRemoveTabId.value = null
}

const freeTimesContainer = ref<HTMLDivElement | null>(null)
const freeTimesContent = ref<HTMLDivElement | null>(null)
const scrollOffset = ref(0)
const scrollStep = 100

const scrollLeft = () => {
  scrollOffset.value = Math.max(0, scrollOffset.value - scrollStep)
}

const scrollRight = () => {
  if (freeTimesContainer.value && freeTimesContent.value) {
    const containerWidth = freeTimesContainer.value.clientWidth
    const contentWidth = freeTimesContent.value.scrollWidth
    const maxScroll = Math.max(0, contentWidth - containerWidth)
    scrollOffset.value = Math.min(maxScroll, scrollOffset.value + scrollStep)
  }
}

const formatHHMM = (seconds: number): string => {
  const s = Math.max(0, seconds)
  const totalMinutes = Math.floor(s / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`
}
</script>
