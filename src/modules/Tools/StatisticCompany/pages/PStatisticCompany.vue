<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import TrucksChart from '../components/TrucksChart.vue'
import RequestsChart from '../components/RequestsChart.vue'
import CompanyTable from '../components/CompanyTable.vue'
import { useStatisticCompany } from '../composables/useStatisticCompany'

const {
  companyNames,
  selectedCompanyId,
  selectedCompanyName,
  timeFilter,
  isLoadingTable,
  isLoadingChart,
  trucksChartData,
  requestsChartData,
  tableCompanies,
  selectCompany,
  selectCompanyByName,
  changeTimeFilter,
} = useStatisticCompany()

const handleCompanySelect = (value: string) => {
  if (value === 'all') {
    selectCompany(null)
  } else {
    selectCompany(value)
  }
}
</script>

<template>
  <div class="min-h-screen bg-white p-[16px_24px] space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold tracking-tight">Statistic company</h1>
      <div class="flex items-center gap-2">
        <Select :model-value="selectedCompanyId || 'all'" @update:model-value="handleCompanySelect">
          <SelectTrigger class="w-45">
            <SelectValue placeholder="Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="company in companyNames" :key="company.id" :value="company.id">
              {{ company.name }}
            </SelectItem>
          </SelectContent>
        </Select>
        <div class="flex items-center bg-muted rounded-md p-1">
          <Button
            variant="secondary"
            size="sm"
            :class="{ 'bg-background shadow-sm': timeFilter === 'Weekly' }"
            @click="changeTimeFilter('Weekly')"
          >
            Weekly
          </Button>
          <Button
            variant="secondary"
            size="sm"
            :class="{ 'bg-background shadow-sm': timeFilter === 'Monthly' }"
            @click="changeTimeFilter('Monthly')"
          >
            Monthly
          </Button>
          <Button
            variant="secondary"
            size="sm"
            :class="{ 'bg-background shadow-sm': timeFilter === 'Yearly' }"
            @click="changeTimeFilter('Yearly')"
          >
            Yearly
          </Button>
        </div>
      </div>
    </div>

    <!-- Charts — empty placeholders when no carrier selected, data when selected -->
    <div class="grid gap-1 md:grid-cols-2">
      <TrucksChart :data="trucksChartData" :loading="isLoadingChart" />
      <RequestsChart :data="requestsChartData" :loading="isLoadingChart" />
    </div>

    <!-- Loading table -->
    <div
      v-if="isLoadingTable && tableCompanies.length === 0"
      class="flex items-center justify-center py-12"
    >
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>

    <!-- Table — always visible with all companies -->
    <CompanyTable
      v-else
      :companies="tableCompanies"
      :selected-company-name="selectedCompanyName"
      @select="selectCompanyByName"
    />
  </div>
</template>
