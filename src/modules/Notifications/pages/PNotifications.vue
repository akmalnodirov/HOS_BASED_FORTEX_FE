<template>
  <div class="flex min-h-[calc(100vh-65px)] flex-col bg-background p-4 text-foreground md:p-6">
    <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">Notifications</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Station, camera, violation, and speed updates for the selected company.
        </p>
      </div>
      <Button variant="outline" :disabled="isLoading || isRefreshing" @click="load(true)">
        <RefreshCw class="mr-2 h-4 w-4" :class="(isLoading || isRefreshing) && 'animate-spin'" />
        Refresh
      </Button>
    </div>

    <div class="mb-5 grid gap-3 sm:grid-cols-3">
      <div
        v-for="card in cards"
        :key="card.label"
        class="rounded-lg border border-border bg-card px-4 py-3 shadow-sm"
      >
        <p class="text-xs text-muted-foreground">{{ card.label }}</p>
        <p class="mt-1 text-2xl font-semibold" :class="card.className">{{ card.value }}</p>
      </div>
    </div>

    <div
      v-if="error"
      class="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
      role="alert"
    >
      {{ error }}
    </div>

    <section class="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div class="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <div class="relative min-w-48 flex-1 sm:max-w-xs">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="search"
            class="h-9 pl-9"
            placeholder="Search notifications"
            aria-label="Search notifications"
          />
        </div>
        <Select v-model="typeFilter">
          <SelectTrigger class="h-9 w-44"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="station">Weight stations</SelectItem>
            <SelectItem value="alpr">ALPR cameras</SelectItem>
            <SelectItem value="violation">Violations</SelectItem>
            <SelectItem value="speed">Speed</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="statusFilter">
          <SelectTrigger class="h-9 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-left text-sm">
          <thead class="bg-muted/70 text-xs text-muted-foreground">
            <tr>
              <th class="w-32 px-4 py-3">
                <button
                  class="inline-flex items-center gap-1 hover:text-foreground"
                  @click="sortBy('type')"
                >
                  Type <ArrowUpDown class="h-3 w-3" />
                </button>
              </th>
              <th class="px-4 py-3">
                <button
                  class="inline-flex items-center gap-1 hover:text-foreground"
                  @click="sortBy('driverName')"
                >
                  Driver <ArrowUpDown class="h-3 w-3" />
                </button>
              </th>
              <th class="px-4 py-3">Reason</th>
              <th class="px-4 py-3">Location</th>
              <th class="w-44 px-4 py-3">
                <button
                  class="inline-flex items-center gap-1 hover:text-foreground"
                  @click="sortBy('occurredAt')"
                >
                  Occurred <ArrowUpDown class="h-3 w-3" />
                </button>
              </th>
              <th class="w-32 px-4 py-3">Status</th>
              <th class="w-24 px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="7" class="h-40 text-center text-muted-foreground">
                <LoaderCircle class="mr-2 inline h-4 w-4 animate-spin" />Loading notifications…
              </td>
            </tr>
            <template v-else>
              <tr
                v-for="item in visible"
                :key="`${item.type}:${item.id}`"
                class="border-t border-border hover:bg-muted/30"
                :class="!item.isRead && 'bg-primary/[0.03]'"
              >
                <td class="px-4 py-3">
                  <span
                    class="rounded-md px-2 py-1 text-xs font-medium"
                    :class="typeClass(item.type)"
                    >{{ typeLabel(item.type) }}</span
                  >
                </td>
                <td class="px-4 py-3 font-medium">{{ item.driverName || '—' }}</td>
                <td class="max-w-72 px-4 py-3">
                  <div class="font-medium">{{ item.title }}</div>
                  <div
                    v-if="item.detail"
                    class="truncate text-xs text-muted-foreground"
                    :title="item.detail"
                  >
                    {{ item.detail }}
                  </div>
                </td>
                <td
                  class="max-w-56 truncate px-4 py-3 text-muted-foreground"
                  :title="item.location || undefined"
                >
                  {{ item.location || '—' }}
                </td>
                <td class="whitespace-nowrap px-4 py-3">{{ formatDate(item.occurredAt) }}</td>
                <td class="px-4 py-3">
                  <div class="flex flex-col items-start gap-1">
                    <span v-if="!item.isRead" class="text-xs font-medium text-blue-600">Unread</span
                    ><span
                      v-if="item.type === 'station' || item.type === 'alpr'"
                      class="text-xs"
                      :class="item.resolvedAt ? 'text-emerald-600' : 'text-amber-600'"
                      >{{ item.resolvedAt ? 'Resolved' : 'Active' }}</span
                    ><span
                      v-if="item.isRead && item.type !== 'station' && item.type !== 'alpr'"
                      class="text-xs text-muted-foreground"
                      >Read</span
                    >
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div class="flex justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8"
                      title="View details"
                      aria-label="View details"
                      @click="selected = item"
                      ><Eye class="h-4 w-4" /></Button
                    ><Button
                      v-if="!item.isRead && (item.type === 'station' || item.type === 'alpr')"
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8"
                      title="Mark read"
                      aria-label="Mark read"
                      :disabled="markingReadId === item.id"
                      @click="markRead(item)"
                      ><LoaderCircle
                        v-if="markingReadId === item.id"
                        class="h-4 w-4 animate-spin" /><Check v-else class="h-4 w-4"
                    /></Button>
                  </div>
                </td>
              </tr>
              <tr v-if="visible.length === 0">
                <td colspan="7" class="h-40 text-center text-sm text-muted-foreground">
                  No notifications match the selected filters.
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground"
      >
        <span>{{ filtered.length }} notification{{ filtered.length === 1 ? '' : 's' }}</span>
        <div class="flex items-center gap-3">
          <span>Page {{ page }} of {{ pageCount }}</span
          ><Button variant="outline" size="sm" :disabled="page <= 1" @click="page--"
            ><ChevronLeft class="h-4 w-4" /></Button
          ><Button variant="outline" size="sm" :disabled="page >= pageCount" @click="page++"
            ><ChevronRight class="h-4 w-4"
          /></Button>
        </div>
      </div>
    </section>

    <CNotificationDetailsModal :notification="selected" @close="selected = null" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  RefreshCw,
  Search,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import CNotificationDetailsModal from '../components/CNotificationDetailsModal.vue'
import { useNotifications } from '../composables/useNotifications'
import type { NotificationItem, NotificationType } from '../types'
import { useAuthStore } from '@/modules/Auth/store/authStore'

const {
  notifications,
  isLoading,
  isRefreshing,
  markingReadId,
  error,
  search,
  typeFilter,
  statusFilter,
  page,
  filtered,
  visible,
  pageCount,
  unreadCount,
  activeCount,
  sortBy,
  load,
  markRead,
} = useNotifications()
const selected = ref<NotificationItem | null>(null)
const authStore = useAuthStore()
const cards = computed(() => [
  { label: 'Total notifications', value: notifications.value.length, className: '' },
  { label: 'Unread', value: unreadCount.value, className: 'text-blue-600' },
  { label: 'Active station / camera', value: activeCount.value, className: 'text-amber-600' },
])
const typeLabel = (type: NotificationType) =>
  ({ station: 'Station', alpr: 'ALPR', violation: 'Violation', speed: 'Speed' })[type]
const typeClass = (type: NotificationType) =>
  ({
    station: 'bg-blue-50 text-blue-700',
    alpr: 'bg-violet-50 text-violet-700',
    violation: 'bg-red-50 text-red-700',
    speed: 'bg-amber-50 text-amber-700',
  })[type]
function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}
onMounted(() => load())
watch(
  () => authStore.companyId,
  () => {
    selected.value = null
    load()
  }
)
</script>
