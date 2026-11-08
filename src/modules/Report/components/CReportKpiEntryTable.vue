<script setup lang="ts">
import { computed, ref } from 'vue'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

const props = defineProps<{
  title: string
  entries: Record<string, unknown>[]
  showDetails?: boolean
}>()
const emit = defineEmits<{ (event: 'details', taskId: string): void }>()

const search = ref('')
const groupByNote = ref(true)
const sortKey = ref<'date' | 'note' | 'count' | 'points'>('count')
const descending = ref(true)
const filtered = computed(() => props.entries.filter(entry =>
  `${entry.note ?? ''} ${entry.reference ?? ''} ${noteItems(entry).map(item => item.title).join(' ')}`
    .toLowerCase().includes(search.value.trim().toLowerCase())
))
const detailed = computed(() => [...filtered.value].sort((a, b) => {
  const direction = descending.value ? -1 : 1
  if (sortKey.value === 'note') return noteLabel(a).localeCompare(noteLabel(b)) * direction
  if (sortKey.value === 'date') return (new Date(String(a.date)).getTime() - new Date(String(b.date)).getTime()) * direction
  return (Number(a.points ?? 0) - Number(b.points ?? 0)) * direction
}))
const grouped = computed(() => {
  const groups = new Map<string, { note: string; count: number; points: number }>()
  for (const entry of filtered.value) {
    const note = noteLabel(entry)
    const group = groups.get(note) ?? { note, count: 0, points: 0 }
    group.count += 1
    group.points += Number(entry.points ?? 0)
    groups.set(note, group)
  }
  const direction = descending.value ? -1 : 1
  return [...groups.values()].sort((a, b) =>
    (sortKey.value === 'note' ? a.note.localeCompare(b.note) :
      sortKey.value === 'points' ? a.points - b.points : a.count - b.count) * direction
  )
})

function noteItems(entry: Record<string, unknown>): { title: string; isScoring: boolean }[] {
  return Array.isArray(entry.noteItems) ? entry.noteItems as { title: string; isScoring: boolean }[] : []
}

function noteLabel(entry: Record<string, unknown>) {
  return String(entry.note || noteItems(entry).map(item => item.title).join(', ') || '—')
}

function sort(key: typeof sortKey.value) {
  if (sortKey.value === key) descending.value = !descending.value
  else {
    sortKey.value = key
    descending.value = true
  }
}

function indicator(key: typeof sortKey.value) {
  return sortKey.value === key ? (descending.value ? '↓' : '↑') : '⇅'
}

function formatDate(value: unknown) {
  return value ? new Date(String(value)).toLocaleString() : '—'
}

function formatNumber(value: unknown) {
  return Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
}
</script>

<template>
  <section class="rounded-xl border border-border bg-card p-4">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h3 class="text-sm font-semibold">{{ title }} <span class="ml-1 rounded-full border border-border px-2 py-0.5 text-xs font-normal text-muted-foreground">{{ entries.length }}</span></h3>
      <div class="flex flex-wrap items-center gap-3">
        <Input v-model="search" placeholder="Filter by note" class="h-9 w-44" />
        <label class="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
          <Switch v-model="groupByNote" />Group by note
        </label>
      </div>
    </div>
    <div class="max-h-64 overflow-auto">
      <table class="w-full min-w-[540px] text-left text-sm">
        <thead class="sticky top-0 bg-muted text-muted-foreground">
          <tr v-if="groupByNote">
            <th class="cursor-pointer px-3 py-2 font-medium" @click="sort('note')">Note {{ indicator('note') }}</th>
            <th class="cursor-pointer px-3 py-2 font-medium" @click="sort('count')">Count {{ indicator('count') }}</th>
            <th class="cursor-pointer px-3 py-2 font-medium" @click="sort('points')">Total points {{ indicator('points') }}</th>
          </tr>
          <tr v-else>
            <th class="cursor-pointer px-3 py-2 font-medium" @click="sort('date')">Date {{ indicator('date') }}</th>
            <th class="cursor-pointer px-3 py-2 font-medium" @click="sort('note')">Note {{ indicator('note') }}</th>
            <th class="px-3 py-2 font-medium">Reference</th>
            <th class="cursor-pointer px-3 py-2 font-medium" @click="sort('points')">Points {{ indicator('points') }}</th>
            <th v-if="showDetails" class="px-3 py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="groupByNote">
            <tr v-for="item in grouped" :key="item.note" class="border-t border-border">
              <td class="px-3 py-2">{{ item.note }}</td>
              <td class="px-3 py-2">{{ item.count }}</td>
              <td class="px-3 py-2 font-semibold">{{ formatNumber(item.points) }}</td>
            </tr>
            <tr v-if="!grouped.length"><td colspan="3" class="px-3 py-6 text-center text-muted-foreground">No entries.</td></tr>
          </template>
          <template v-else>
            <tr v-for="(entry, index) in detailed" :key="index" class="border-t border-border">
              <td class="whitespace-nowrap px-3 py-2">{{ formatDate(entry.date) }}</td>
              <td class="px-3 py-2">
                <template v-if="noteItems(entry).length">
                  <span v-for="(item, noteIndex) in noteItems(entry)" :key="noteIndex" class="mr-1 inline-flex rounded-md border px-2 py-0.5 text-xs" :class="item.isScoring ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700' : 'border-border bg-muted text-muted-foreground'">{{ item.title }}</span>
                </template>
                <template v-else>{{ noteLabel(entry) }}</template>
              </td>
              <td class="px-3 py-2">{{ entry.reference || '—' }}</td>
              <td class="px-3 py-2">{{ formatNumber(entry.points) }}</td>
              <td v-if="showDetails" class="px-3 py-2"><button v-if="entry.taskId" type="button" class="text-xs font-medium text-primary hover:underline" @click="emit('details', String(entry.taskId))">History</button></td>
            </tr>
            <tr v-if="!detailed.length"><td :colspan="showDetails ? 5 : 4" class="px-3 py-6 text-center text-muted-foreground">No entries.</td></tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>
