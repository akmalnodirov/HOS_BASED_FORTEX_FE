<template>
  <div class="flex items-center flex-col gap-1">
    <div class="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-card w-full py-4 px-6">
      <div class="flex items-center gap-2 flex-wrap">
        <div v-if="tabs.length > 0 || canManageTabs" class="flex items-center gap-1 flex-wrap">
          <button
            v-for="(tab, i) in tabs"
            :disabled="submitLoading || actionsPending"
            :key="tab.id"
            class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors"
            :class="
              selectedTab?.id === tab.id
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-border hover:bg-muted'
            "
            @click="$emit('select-tab', tab)"
          >
            <span>{{ isAudit && i === 1 && tab.name === 'Changed' ? 'Audit' : tab.name }}</span>
            <span
              v-if="canManageTabs && tab.type === 1 && i === tabs.length - 1 && tabs.length > 1"
              class="ml-0.5 rounded p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
              @click.stop="requestRemoveTab(tab.id)"
            >
              <X class="w-2.5 h-2.5" />
            </span>
          </button>

          <button
            v-if="canManageTabs"
            :disabled="submitLoading || actionsPending"
            class="flex items-center justify-center w-7 h-7 rounded-md border border-border bg-background hover:bg-muted transition-colors"
            @click="$emit('new-click')"
          >
            <Plus class="w-3.5 h-3.5" />
          </button>
        </div>
        <span v-if="isAudit" class="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
          Audit generated
        </span>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-2">
        <div v-if="coDriverId" class="flex items-center gap-1 rounded-md border border-border bg-muted/40 p-1" aria-label="Active driver">
          <button
            v-for="driver in [{ id: mainDriverId, name: mainDriverName || 'Driver', tone: 'text-blue-600' }, { id: coDriverId, name: coDriverName || 'Co-driver', tone: 'text-red-600' }]"
            :key="driver.id"
            type="button"
            class="max-w-44 truncate rounded px-2.5 py-1 text-xs font-semibold transition-colors"
            :class="driverId === driver.id ? 'bg-background shadow-sm ' + driver.tone : 'text-muted-foreground hover:bg-background/70'"
            :title="driver.name"
            @click="$emit('update:driver-id', driver.id || '')"
          >{{ driver.name }}</button>
        </div>
        <Button
          v-if="allowReview"
          variant="outline"
          size="sm"
          class="h-9 px-4 text-xs"
          :disabled="!selectedTab"
          @click="$emit('review-click')"
        >
          <ClipboardCheck class="mr-2 h-4 w-4" /> AI Review
        </Button>
        <Popover v-if="presenceUsers.length > 1" :open="presenceOpen" @update:open="onPresenceOpenChange">
          <PopoverTrigger as-child>
            <Button
              variant="outline"
              size="sm"
              class="h-9 gap-2 animate-pulse border-red-500 bg-red-100 px-3 text-xs font-bold text-red-800 shadow-lg shadow-red-500/40 ring-2 ring-red-200 hover:bg-red-200 motion-reduce:animate-none dark:border-red-500 dark:bg-red-950 dark:text-red-200 dark:shadow-red-500/30 dark:ring-red-900 dark:hover:bg-red-900"
              :aria-label="`${presenceUsers.length} users on this driver log`"
            >
              <span class="h-2.5 w-2.5 rounded-full bg-red-600" />
              <UsersRound class="h-4 w-4" />
              {{ presenceUsers.length }} users on this log
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="end"
            class="w-80 border-red-400 p-0 shadow-xl shadow-red-500/30 dark:border-red-600 dark:shadow-red-950/60"
            @interact-outside="(event) => event.preventDefault()"
            @escape-key-down="(event) => event.preventDefault()"
          >
            <div class="flex items-start justify-between gap-2 border-b border-red-200 px-4 py-3 dark:border-red-900">
              <div>
                <div class="text-sm font-semibold text-foreground">Concurrent access</div>
                <p class="mt-1 text-xs text-muted-foreground">Another user may be changing this log. Review their activity before saving.</p>
              </div>
              <button type="button" class="rounded p-1 text-muted-foreground hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950" aria-label="Close concurrent access" @click="closePresence">
                <X class="h-4 w-4" />
              </button>
            </div>
            <div class="max-h-80 divide-y divide-border overflow-y-auto">
              <div v-for="user in presenceUsers" :key="user.userId" class="space-y-2 px-4 py-3 text-xs">
                <div class="flex items-center justify-between gap-2">
                  <span class="font-semibold text-foreground">{{ user.displayName }}{{ user.userId === currentUserId ? ' (You)' : '' }}</span>
                  <span class="rounded px-1.5 py-0.5 font-medium" :class="user.action === 'Editing' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-muted text-muted-foreground'">{{ user.action }}</span>
                </div>
                <div class="grid grid-cols-[72px_1fr] gap-x-2 gap-y-1 text-muted-foreground">
                  <span>User ID</span><span class="truncate text-foreground" :title="user.displayName">{{ user.displayName }}</span>
                  <span>Log period</span><span class="text-foreground">{{ user.fromDate }} &ndash; {{ user.toDate }}</span>
                  <span>Date</span><span class="text-foreground">{{ formatPresenceDate(user.accessedAt) }}</span>
                  <span>Login time</span><span class="text-foreground">{{ formatPresenceTime(user.editingStartedAt || user.accessedAt) }}</span>
                  <span>Duration</span><span class="text-foreground">{{ formatPresenceDuration(user.editingStartedAt || user.accessedAt) }}</span>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Button
          v-if="allowAssistant"
          variant="outline"
          size="sm"
          class="h-9 px-4 text-xs text-blue-600"
          :disabled="!selectedTab"
          @click="$emit('assistant-click')"
        >
          <Sparkles class="mr-2 h-4 w-4" /> Assistant
        </Button>
        <Button
          v-if="primarySessionAction && (primarySessionAction === 'submit' ? allowSubmit : allowRollback)"
          size="sm"
          :class="[
            'h-9 px-5 text-xs font-semibold shadow-sm transition-colors',
            primarySessionAction === 'rollback'
              ? 'bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500',
          ]"
          :disabled="submitDisabled || submitLoading || actionsPending || (primarySessionAction === 'rollback' && rollbackBlocked)"
          @click="$emit('session-action', primarySessionAction)"
        >
          <span v-if="submitLoading" class="flex items-center gap-1.5">
            <span
              class="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            {{ primarySessionAction === 'rollback' ? 'Rolling back...' : 'Submitting...' }}
          </span>
          <span v-else>{{ primarySessionActionLabel }}</span>
        </Button>
      </div>
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
          <Button variant="destructive" :disabled="actionsPending || submitLoading" @click="confirmRemoveTab">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ClipboardCheck, Plus, Sparkles, UsersRound, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { TabResponse } from '../types/boost.ts'
import type { BoostPresenceUser } from '../composables/useBoostPresence'

const props = withDefaults(
  defineProps<{
    submitDisabled?: boolean
    submitLoading?: boolean
    actionsPending?: boolean
    sessionStatus?: string
    isAudit?: boolean
    pendingSubmissionCount?: number
    pendingRollbackCount?: number
    rollbackBlocked?: boolean
    canManageTabs?: boolean
    allowSubmit?: boolean
    allowRollback?: boolean
    allowAssistant?: boolean
    allowReview?: boolean
    tabs?: TabResponse[]
    selectedTab?: TabResponse | null
    driverId?: string
    mainDriverId?: string
    mainDriverName?: string
    coDriverId?: string | null
    coDriverName?: string | null
    presenceUsers?: BoostPresenceUser[]
    presenceScopeKey?: string
    currentUserId?: string
  }>(),
  {
    submitDisabled: false,
    submitLoading: false,
    actionsPending: false,
    sessionStatus: 'DRAFT',
    isAudit: false,
    pendingSubmissionCount: 0,
    pendingRollbackCount: 0,
    rollbackBlocked: false,
    canManageTabs: false,
    allowSubmit: false,
    allowRollback: false,
    allowAssistant: false,
    allowReview: false,
    tabs: () => [],
    selectedTab: null,
    driverId: '',
    mainDriverId: '',
    mainDriverName: '',
    coDriverId: null,
    coDriverName: null,
    presenceUsers: () => [],
    presenceScopeKey: '',
    currentUserId: '',
  }
)

const emit = defineEmits<{
  (e: 'initial-click'): void
  (e: 'new-click'): void
  (e: 'session-action', action: 'submit' | 'rollback'): void
  (e: 'select-tab', tab: TabResponse): void
  (e: 'remove-tab', tabId: string): void
  (e: 'ai-advice-click'): void
  (e: 'assistant-click'): void
  (e: 'review-click'): void
  (e: 'update:driver-id', driverId: string): void
}>()

const primarySessionAction = computed<'submit' | 'rollback' | null>(() => {
  const status = String(props.sessionStatus || 'DRAFT').toUpperCase()
  if (status === 'DRAFT') return 'submit'
  if (status === 'SUBMITTED') return props.pendingSubmissionCount > 0 ? 'submit' : 'rollback'
  if (status === 'ROLLED_BACK' && props.pendingRollbackCount > 0) return 'rollback'
  return null
})

const primarySessionActionLabel = computed(() => {
  const status = String(props.sessionStatus || 'DRAFT').toUpperCase()
  if (primarySessionAction.value === 'submit') return status === 'SUBMITTED' ? 'Re-Submit' : 'Submit'
  if (primarySessionAction.value === 'rollback')
    return status === 'ROLLED_BACK' ? 'Re-Rollback' : 'Rollback'
  return ''
})

const showDeleteConfirm = ref(false)
const presenceOpen = ref(false)
const presenceDismissed = ref(false)
const presenceNow = ref(Date.now())
let presenceClock: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  presenceClock = setInterval(() => { presenceNow.value = Date.now() }, 15_000)
  openPresenceWhenReady()
})
onBeforeUnmount(() => { if (presenceClock) clearInterval(presenceClock) })

watch([() => props.presenceScopeKey, () => props.presenceUsers.length], ([scope, count], [previousScope]) => {
  if (scope !== previousScope || count <= 1) {
    presenceOpen.value = false
    presenceDismissed.value = false
  }
  if (count > 1) openPresenceWhenReady()
}, { flush: 'post' })

async function openPresenceWhenReady() {
  if (props.presenceUsers.length <= 1 || presenceDismissed.value) return
  const scope = props.presenceScopeKey
  await nextTick()
  requestAnimationFrame(() => {
    if (props.presenceScopeKey === scope && props.presenceUsers.length > 1 && !presenceDismissed.value)
      presenceOpen.value = true
  })
}

function onPresenceOpenChange(open: boolean) {
  if (open) presenceOpen.value = true
}

function closePresence() {
  presenceDismissed.value = true
  presenceOpen.value = false
}

function formatPresenceDate(value: string) {
  return new Date(value).toLocaleDateString()
}

function formatPresenceTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatPresenceDuration(value: string) {
  const seconds = Math.max(0, Math.floor((presenceNow.value - new Date(value).getTime()) / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`
}

const pendingRemoveTabId = ref<string | null>(null)

const requestRemoveTab = (tabId: string) => {
  if (props.actionsPending || props.submitLoading) return
  pendingRemoveTabId.value = tabId
  showDeleteConfirm.value = true
}

const confirmRemoveTab = () => {
  if (props.actionsPending || props.submitLoading) return
  if (pendingRemoveTabId.value) {
    emit('remove-tab', pendingRemoveTabId.value)
  }
  showDeleteConfirm.value = false
  pendingRemoveTabId.value = null
}

</script>
