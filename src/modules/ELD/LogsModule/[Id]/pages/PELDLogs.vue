<script setup lang="ts">
import { provide } from 'vue'
import { RefreshCw, Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import CELDLogsTable from '../components/CELDLogsTable.vue'
import { useELDLogs } from '../composables/useELDLogs'

const eventOptions = [
  { value: 'all', label: 'All events' },
  { value: 'driving', label: 'Driving' },
  { value: 'on-duty', label: 'On duty' },
  { value: 'off-duty', label: 'Off duty' },
  { value: 'sleeper-berth', label: 'Sleeper berth' },
  { value: 'personal-conveyance', label: 'Personal conveyance' },
  { value: 'yard-move', label: 'Yard move' },
  { value: 'unknown', label: 'Unknown' },
]

const statusOptions = [
  { value: 'all', label: 'All ELD statuses' },
  { value: 'connected', label: 'Connected' },
  { value: 'disconnected', label: 'Disconnected' },
  { value: 'not-connected', label: 'Not connected' },
]

const logsInstance = useELDLogs()
provide('eldLogs', logsInstance)

const { loading, summary, searchQuery, eventFilter, violationFilter, statusFilter, fetchLogs } =
  logsInstance
</script>

<template>
  <div
    class="flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden bg-white p-4 dark:bg-background sm:p-6"
  >
    <div class="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-foreground">Logs</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Route ELD driver status and daily log summaries
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="relative min-w-56 flex-1 sm:w-64 sm:flex-none">
          <Search
            class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input v-model="searchQuery" placeholder="Search drivers" class="h-10 pl-9 text-sm" />
        </div>

        <Select v-model="eventFilter">
          <SelectTrigger class="h-10 w-44 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="option in eventOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>

        <Label
          class="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border px-3 transition-colors hover:bg-accent has-[[aria-checked=true]]:border-primary has-[[aria-checked=true]]:bg-primary/10"
        >
          <Checkbox
            id="violation-filter"
            v-model:checked="violationFilter"
            class="h-4 w-4 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />
          <span class="whitespace-nowrap text-sm font-medium">Only violations</span>
        </Label>

        <Select v-model="statusFilter">
          <SelectTrigger class="h-10 w-44 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="option in statusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" class="h-10" :disabled="loading" @click="fetchLogs(true)">
          <RefreshCw class="mr-2 h-4 w-4" :class="loading && 'animate-spin'" />
          Refresh
        </Button>
      </div>
    </div>

    <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-lg border border-border bg-card px-4 py-3">
        <div class="text-xs text-muted-foreground">Drivers</div>
        <div class="mt-1 text-2xl font-semibold text-foreground">{{ summary.drivers }}</div>
      </div>
      <div class="rounded-lg border border-border bg-card px-4 py-3">
        <div class="text-xs text-muted-foreground">Connected ELDs</div>
        <div class="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
          {{ summary.connected }}
        </div>
      </div>
      <div class="rounded-lg border border-border bg-card px-4 py-3">
        <div class="text-xs text-muted-foreground">Locations available</div>
        <div class="mt-1 text-2xl font-semibold text-blue-600 dark:text-blue-400">
          {{ summary.locationsAvailable }}
        </div>
      </div>
      <div class="rounded-lg border border-border bg-card px-4 py-3">
        <div class="text-xs text-muted-foreground">Current violations</div>
        <div class="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">
          {{ summary.currentViolations }}
        </div>
      </div>
    </div>

    <CELDLogsTable class="min-h-0 flex-1" />
  </div>
</template>
