<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <div class="space-y-6">
      <!-- Header -->
      <div class="mb-5">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-semibold text-foreground">Statistic admin</h2>

          <div class="flex items-center gap-3">
            <!-- Admin Select -->
            <Select v-model="selectedAdmin">
              <SelectTrigger class="w-48 dark:bg-card border-border">
                <SelectValue placeholder="Select admin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in adminOptions" :key="option.id" :value="option.id">
                  {{ option.name }}
                </SelectItem>
              </SelectContent>
            </Select>

            <!-- Date Range -->
            <div class="relative">
              <Input
                v-model="dateRange"
                readonly
                class="w-64 border-border text-foreground cursor-pointer pr-10"
              />
              <Calendar
                class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
              />
            </div>

            <!-- Time Filters -->
            <div class="flex items-center gap-2">
              <Button
                @click="setTimeFilter('daily')"
                :variant="activeTimeFilter === 'daily' ? 'default' : 'outline'"
                size="sm"
                :class="
                  activeTimeFilter === 'daily' &&
                  'bg-primary text-primary-foreground'
                "
              >
                Daily
              </Button>
              <Button
                @click="setTimeFilter('weekly')"
                :variant="activeTimeFilter === 'weekly' ? 'default' : 'outline'"
                size="sm"
                :class="
                  activeTimeFilter === 'weekly' &&
                  'bg-primary text-primary-foreground'
                "
              >
                Weekly
              </Button>
              <Button
                @click="setTimeFilter('monthly')"
                :variant="activeTimeFilter === 'monthly' ? 'default' : 'outline'"
                size="sm"
                :class="
                  activeTimeFilter === 'monthly' &&
                  'bg-primary text-primary-foreground'
                "
              >
                Monthly
              </Button>
              <Button
                @click="setTimeFilter('yearly')"
                :variant="activeTimeFilter === 'yearly' ? 'default' : 'outline'"
                size="sm"
                :class="
                  activeTimeFilter === 'yearly' &&
                  'bg-primary text-primary-foreground'
                "
              >
                Yearly
              </Button>
            </div>
          </div>
        </div>

        <!-- Admin Info & Stats Cards -->
        <div class="grid grid-cols-4 gap-6 mb-6">
          <!-- Admin Card -->
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold"
            >
              TJ
            </div>
            <div>
              <h3 class="font-semibold text-foreground">{{ admin.name }}</h3>
              <p class="text-sm text-green-600 dark:text-green-400 font-medium">{{ admin.percentage }}</p>
            </div>
          </div>

          <!-- Stats Cards -->
          <div
            v-for="card in statsCards"
            :key="card.label"
            class="bg-muted/50 rounded-lg p-4 border border-border/50"
          >
            <p class="text-sm text-muted-foreground mb-1">{{ card.label }}</p>
            <p class="text-2xl font-semibold text-foreground">{{ card.value }}</p>
            <p v-if="card.total" class="text-xs text-muted-foreground/70 mt-1">
              {{ card.total }}
            </p>
          </div>
        </div>

        <!-- Admin Details -->
        <div class="flex items-center gap-8 text-sm">
          <div>
            <span class="text-muted-foreground">Start date: </span>
            <span class="text-foreground">{{ admin.startDate }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">End date: </span>
            <span class="text-foreground">{{ admin.endDate }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Edit date: </span>
            <span class="text-foreground">{{ admin.editDate }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Mistake fixed: </span>
            <span class="text-foreground">{{ admin.mistakeFixed }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Violation fixed: </span>
            <span
              :class="
                admin.violationFixed < 0 ? 'text-destructive font-semibold' : 'text-foreground'
              "
            >
              {{ admin.violationFixed }}
            </span>
          </div>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="grid grid-cols-3 gap-6">
        <!-- KPI Chart -->
        <div class="bg-card rounded-lg border border-border p-6 shadow-none">
          <KpiChart :data="kpiData" />
        </div>

        <!-- Tasks Chart -->
        <div class="bg-card rounded-lg border border-border p-6 shadow-none">
          <TasksChart :data="tasksData" />
        </div>

        <!-- Donut Chart -->
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
          <DonutChart :data="donutData" />
        </div>
      </div>

      <!-- Second Row Charts -->
      <div class="grid grid-cols-3 gap-6">
        <!-- Tasks Bar Chart (Left) -->
        <div class="bg-card rounded-lg border border-border p-6 shadow-none">
          <TasksBarChart :tasks="tasksList" />
        </div>

        <!-- Tasks Bar Chart (Right) - Same component, different data -->
        <div class="col-span-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
          <TasksBarChart :tasks="tasksList" />
        </div>
      </div>

      <!-- Table -->
      <div class="bg-card rounded-lg border border-border shadow-none">
        <StatisticsTable
          :records="paginatedRecords"
          :sort-key="sortKey"
          :sort-order="sortOrder"
          @sort="handleSort"
          @action="handleAction"
        />

        <!-- Footer / Pagination -->
        <div
          class="px-6 py-4 border-t border-border flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm text-muted-foreground">Display on page</span>
            <Select v-model="itemsPerPage">
              <SelectTrigger class="w-20 border-border dark:bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="10">10</SelectItem>
                <SelectItem :value="25">25</SelectItem>
                <SelectItem :value="50">50</SelectItem>
                <SelectItem :value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span class="text-sm text-muted-foreground">
              {{ totalEntries }} entries
            </span>
          </div>

          <div class="flex items-center gap-4">
            <div class="flex gap-1">
              <button
                v-for="page in pageNumbers"
                :key="page"
                @click="typeof page === 'number' && goToPage(page)"
                :disabled="page === '...'"
                :class="[
                  'min-w-[32px] h-8 px-2 text-sm font-medium rounded transition-colors',
                  page === currentPage
                    ? 'bg-primary text-primary-foreground'
                    : page === '...'
                      ? 'text-muted-foreground/50 cursor-default'
                      : 'text-foreground hover:bg-accent',
                ]"
              >
                {{ page }}
              </button>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">
                {{ currentPage }} of {{ totalPages }} pages
              </span>
              <Button
                @click="previousPage"
                :disabled="currentPage === 1"
                variant="outline"
                size="icon"
                class="h-8 w-8 border-border"
              >
                <ChevronLeft class="w-4 h-4" />
              </Button>
              <Button
                @click="nextPage"
                :disabled="currentPage === totalPages"
                variant="outline"
                size="icon"
                class="h-8 w-8 border-border"
              >
                <ChevronRight class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<!-- src/views/StatisticsAdminView.vue -->
<script setup lang="ts">
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import KpiChart from '@/modules/Tools/StatisticAdmin/components/KpiChart.vue'
import TasksChart from '@/modules/Tools/StatisticAdmin/components/TasksChart.vue'
import DonutChart from '@/modules/Tools/StatisticAdmin/components/DonutChart.vue'
import TasksBarChart from '@/modules/Tools/StatisticAdmin/components/TasksBarChart.vue'
import StatisticsTable from '@/modules/Tools/StatisticAdmin/components/CStatisticsTable.vue'
import { useStatistics } from '@/modules/Tools/StatisticAdmin/composables/useAdminStatistics.ts'

const {
  // State
  selectedAdmin,
  dateRange,
  activeTimeFilter,
  isLoading,
  admin,
  statsCards,
  kpiData,
  tasksData,
  donutData,
  tasksList,
  adminOptions,

  // Sorting
  sortKey,
  sortOrder,

  // Pagination
  currentPage,
  itemsPerPage,
  totalPages,
  totalEntries,
  pageNumbers,
  goToPage,
  nextPage,
  previousPage,

  // Computed
  paginatedRecords,

  // Functions
  handleSort,
  setTimeFilter,
} = useStatistics()

const handleAction = (id: string) => {
  console.log('Action for record:', id)
}
</script>
