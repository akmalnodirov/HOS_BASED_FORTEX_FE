<template>
  <div class="min-h-screen bg-white dark:bg-background p-[16px_24px]">
    <div class="mb-5">
      <!-- Header -->
      <div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-semibold text-foreground">Logs</h2>
            <!-- Search -->
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
              />
              <Input v-model="searchQuery" placeholder="Search" class="pl-9 w-64 h-10 text-sm" />
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Event Filter -->
            <Select v-model="eventFilter">
              <SelectTrigger class="w-44 h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in eventOptions"
                  :key="option.value"
                  :value="option.value"
                  class="text-sm"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>

            <!-- Violation Filter -->
            <Label
              class="hover:bg-accent flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 h-10 cursor-pointer has-[[aria-checked=true]]:border-primary has-[[aria-checked=true]]:bg-primary/10 transition-colors"
            >
              <Checkbox
                id="violation-filter"
                v-model:checked="violationFilter"
                class="w-4 h-4 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              />
              <span class="text-sm font-medium">Show only violations</span>
            </Label>

            <!-- Status Filter -->
            <Select v-model="statusFilter">
              <SelectTrigger class="w-40 h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in statusOptions"
                  :key="option.value"
                  :value="option.value"
                  class="text-sm"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>

    <!-- Table Component -->
    <CELDLogsTable />
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import { Search } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import CELDLogsTable from '../components/CELDLogsTable.vue'
import { useELDLogs } from '../composables/useELDLogs.ts'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

// Event status options
const eventOptions = [
  { value: 'all', label: 'All events' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'driving', label: 'Driving' },
  { value: 'off-duty-off', label: 'Off duty (OFF)' },
  { value: 'on-duty', label: 'On duty' },
  { value: 'off-duty-ym', label: 'Off duty (YM)' },
  { value: 'off-duty-pc', label: 'Off duty (PC)' },
]

// Status options
const statusOptions = [
  { value: 'all', label: 'All status' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
]

// Single composable instance shared with child components via provide/inject
const logsInstance = useELDLogs()
provide('eldLogs', logsInstance)

const { searchQuery, eventFilter, violationFilter, statusFilter } = logsInstance
</script>
