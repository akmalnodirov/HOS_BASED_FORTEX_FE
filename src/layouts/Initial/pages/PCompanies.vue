<script setup lang="ts">
import { Building2, ChevronLeft, ChevronRight, LoaderCircle, Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import SortIcon from '@/components/icons/SortIcon.vue'
import { useCompanies } from '@/layouts/Initial/composables/useCompanies'

const {
  isLoading,
  selectingCompanyId,
  error,
  searchCompany,
  searchUsdot,
  sortKey,
  currentPage,
  itemsPerPage,
  totalPages,
  totalEntries,
  pageNumbers,
  paginatedCompanies,
  goToPage,
  nextPage,
  previousPage,
  fetchCompanies,
  selectCompany,
  handleSort,
} = useCompanies()
</script>

<template>
  <div
    class="flex min-h-[calc(100vh-124px)] flex-col bg-white p-[16px_24px] dark:bg-background"
  >
    <div class="mb-5 flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-foreground">Select company</h2>
        <p class="mt-1 text-sm text-muted-foreground">Companies are synchronized from Route ELD.</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="searchCompany" placeholder="Search company" class="w-64 pl-9" />
        </div>
        <div class="relative">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="searchUsdot" placeholder="Search USDOT" class="w-56 pl-9" />
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="flex flex-1 items-center justify-center py-16">
      <LoaderCircle class="h-8 w-8 animate-spin text-primary" />
    </div>

    <div v-else-if="error" class="flex flex-1 flex-col items-center justify-center py-16">
      <p class="text-sm text-destructive">{{ error }}</p>
      <Button variant="outline" class="mt-4" @click="fetchCompanies">Try again</Button>
    </div>

    <div v-else class="flex-1 overflow-hidden rounded-lg border border-border">
      <table class="w-full text-left text-sm">
        <thead class="bg-muted/60 text-xs uppercase text-muted-foreground">
          <tr>
            <th class="w-16 px-5 py-3">No</th>
            <th class="px-5 py-3">
              <button class="flex items-center gap-1" @click="handleSort('name')">
                Company
                <SortIcon class="h-4 w-4" :class="sortKey === 'name' ? 'text-primary' : ''" />
              </button>
            </th>
            <th class="px-5 py-3">
              <button class="flex items-center gap-1" @click="handleSort('dotNumber')">
                USDOT
                <SortIcon class="h-4 w-4" :class="sortKey === 'dotNumber' ? 'text-primary' : ''" />
              </button>
            </th>
            <th class="w-32 px-5 py-3">Status</th>
            <th class="w-40 px-5 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(company, index) in paginatedCompanies"
            :key="company.id"
            class="border-t border-border transition-colors hover:bg-muted/30"
          >
            <td class="px-5 py-4 text-muted-foreground">
              {{ (currentPage - 1) * itemsPerPage + index + 1 }}
            </td>
            <td class="px-5 py-4">
              <div class="flex items-center gap-3">
                <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 class="h-4 w-4 text-primary" />
                </span>
                <span class="font-medium text-foreground">{{ company.name }}</span>
              </div>
            </td>
            <td class="px-5 py-4 text-muted-foreground">{{ company.dotNumber || '—' }}</td>
            <td class="px-5 py-4">
              <span
                class="rounded-full px-2.5 py-1 text-xs font-medium"
                :class="
                  company.isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground'
                "
              >
                {{ company.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="px-5 py-4 text-right">
              <Button
                size="sm"
                :disabled="!company.isActive || selectingCompanyId !== null"
                @click="selectCompany(company)"
              >
                <LoaderCircle
                  v-if="selectingCompanyId === company.id"
                  class="mr-2 h-4 w-4 animate-spin"
                />
                Select
              </Button>
            </td>
          </tr>
          <tr v-if="paginatedCompanies.length === 0">
            <td colspan="5" class="px-5 py-16 text-center text-muted-foreground">
              No companies found.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-auto flex items-center justify-between py-4">
      <div class="flex items-center gap-3">
        <span class="text-sm text-muted-foreground">Display on page</span>
        <Select v-model="itemsPerPage">
          <SelectTrigger class="w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem :value="10">10</SelectItem>
            <SelectItem :value="25">25</SelectItem>
            <SelectItem :value="50">50</SelectItem>
            <SelectItem :value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span class="text-sm text-muted-foreground">{{ totalEntries }} entries</span>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex gap-1">
          <button
            v-for="page in pageNumbers"
            :key="page"
            class="h-8 min-w-8 rounded px-2 text-sm"
            :class="page === currentPage ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
            :disabled="page === '...'"
            @click="typeof page === 'number' && goToPage(page)"
          >
            {{ page }}
          </button>
        </div>
        <span class="text-sm text-muted-foreground">
          {{ currentPage }} of {{ totalPages }} pages
        </span>
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8"
          :disabled="currentPage === 1"
          @click="previousPage"
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8"
          :disabled="currentPage === totalPages"
          @click="nextPage"
        >
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</template>
