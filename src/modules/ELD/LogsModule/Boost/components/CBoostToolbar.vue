<template>
  <div class="flex items-center flex-col gap-1">
    <div class="flex items-center justify-between bg-white dark:bg-card w-full py-4 px-6">
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
            <span>{{ tab.name }}</span>
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
      </div>

      <div class="flex items-center gap-2">
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
import { computed, ref } from 'vue'
import { Plus, Sparkles, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { TabResponse } from '../types/boost.ts'

const props = withDefaults(
  defineProps<{
    submitDisabled?: boolean
    submitLoading?: boolean
    actionsPending?: boolean
    sessionStatus?: string
    pendingSubmissionCount?: number
    pendingRollbackCount?: number
    rollbackBlocked?: boolean
    canManageTabs?: boolean
    allowSubmit?: boolean
    allowRollback?: boolean
    allowAssistant?: boolean
    tabs?: TabResponse[]
    selectedTab?: TabResponse | null
    driverId?: string
    mainDriverId?: string
    mainDriverName?: string
    coDriverId?: string | null
    coDriverName?: string | null
  }>(),
  {
    submitDisabled: false,
    submitLoading: false,
    actionsPending: false,
    sessionStatus: 'DRAFT',
    pendingSubmissionCount: 0,
    pendingRollbackCount: 0,
    rollbackBlocked: false,
    canManageTabs: false,
    allowSubmit: false,
    allowRollback: false,
    allowAssistant: false,
    tabs: () => [],
    selectedTab: null,
    driverId: '',
    mainDriverId: '',
    mainDriverName: '',
    coDriverId: null,
    coDriverName: null,
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
