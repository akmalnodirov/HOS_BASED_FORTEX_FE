<template>
  <div class="flex h-14 items-stretch border-b border-border bg-background">
    <button
      v-for="(tab, index) in workingTabs"
      :key="tab.id"
      type="button"
      :title="tab.name"
      :disabled="store.isBusy"
      class="flex w-14 items-center justify-center border-r border-border text-base transition-colors"
      :class="
        tab.id === store.activeTabId
          ? 'border border-foreground bg-muted font-medium'
          : 'hover:bg-muted text-muted-foreground'
      "
      @click="select(tab.id)"
    >
      {{ index + 1 }}
    </button>
    <button
      v-if="canManageTabs"
      type="button"
      aria-label="New draft tab"
      :disabled="store.isBusy"
      class="flex w-14 items-center justify-center border-r border-border text-muted-foreground hover:bg-muted"
      @click="add"
    >
      <Plus class="h-5 w-5" />
    </button>
    <div class="flex-1" />
    <button
      type="button"
      aria-label="Delete this draft tab"
      :disabled="!canDelete || store.isBusy"
      class="flex w-14 items-center justify-center border-l border-border text-muted-foreground transition-colors enabled:hover:border-destructive enabled:hover:bg-destructive/10 enabled:hover:text-destructive disabled:opacity-40"
      @click="confirmOpen = true"
    >
      <Trash2 class="h-5 w-5" />
    </button>

    <Dialog v-model:open="confirmOpen">
      <DialogContent class="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle class="text-center">Delete this draft tab?</DialogTitle>
        </DialogHeader>
        <DialogFooter class="grid grid-cols-2 gap-2">
          <Button variant="outline" @click="confirmOpen = false">Cancel</Button>
          <Button :disabled="store.isBusy" @click="remove">Yes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useBoostWorkspaceStore } from '@/modules/ELD/LogsModule/Boost/store/boostWorkspace'

const props = defineProps<{ canManageTabs: boolean }>()

const store = useBoostWorkspaceStore()
const route = useRoute()
const router = useRouter()
const confirmOpen = ref(false)

// The AI edits the latest working draft; the initial and final tabs are not shown here.
const workingTabs = computed(() =>
  (store.session?.tabs ?? []).filter((tab) => tab.kind === 'WORKING').sort((a, b) => a.position - b.position)
)
// Same rule as the Boost toolbar: only the last working tab, and never the only tab.
const canDelete = computed(() => {
  const tabs = store.session?.tabs ?? []
  const last = workingTabs.value[workingTabs.value.length - 1]
  return (
    props.canManageTabs &&
    store.session?.status === 'DRAFT' &&
    tabs.length > 1 &&
    Boolean(last) &&
    last.id === store.activeTabId
  )
})

async function syncRoute(tabId: string) {
  if (router && route) await router.replace({ query: { ...route.query, tabId } })
}

async function select(tabId: string) {
  try {
    await store.selectTab(tabId)
    await syncRoute(tabId)
  } catch (error: any) {
    toast.error(error?.response?.data?.message || error?.message || 'Failed to load tab')
  }
}

async function add() {
  try {
    const value = await store.createTab()
    if (value) await syncRoute(value.tabId)
  } catch (error: any) {
    toast.error(error?.response?.data?.message || error?.message || 'Failed to create tab')
  }
}

async function remove() {
  const tabId = store.activeTabId
  if (!tabId || !canDelete.value) return
  try {
    const value = await store.deleteTab(tabId)
    confirmOpen.value = false
    if (value) await syncRoute(value.tabId)
  } catch (error: any) {
    toast.error(error?.response?.data?.message || error?.message || 'Failed to delete tab')
  }
}
</script>
