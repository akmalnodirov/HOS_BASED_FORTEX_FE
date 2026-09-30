<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import CCustomCheckbox from '@/components/custom/CCustomCheckbox.vue'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-vue-next'
import SortIcon from '@/components/icons/SortIcon.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Company } from '../types'

type SortKey = 'companyName' | 'companyAverage' | 'currentActiveDrivers' | 'totalDrivers'

const props = defineProps<{
  companies: Company[]
  selectedCompanyName: string | null
}>()

const emit = defineEmits<{
  (e: 'select', companyName: string | null): void
}>()

const currentPage = ref(1)
const pageSize = ref(10)

const sortKey = ref<SortKey | null>(null)
const sortOrder = ref<'asc' | 'desc'>('asc')

const handleSort = (key: SortKey) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
  currentPage.value = 1
}

const sortedCompanies = computed(() => {
  if (!sortKey.value) return props.companies
  return [...props.companies].sort((a, b) => {
    const key = sortKey.value!
    const aVal = a[key]
    const bVal = b[key]
    if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
})

const totalPages = computed(() => Math.ceil(sortedCompanies.value.length / pageSize.value) || 1)

const paginatedCompanies = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedCompanies.value.slice(start, start + pageSize.value)
})

const maxTotal = computed(() => {
  if (props.companies.length === 0) return 1
  return Math.max(...props.companies.map((c) => c.totalDrivers)) || 1
})

watch(() => props.companies.length, () => {
  currentPage.value = 1
})

const handleRowClick = (company: Company) => {
  if (props.selectedCompanyName === company.companyName) {
    emit('select', null)
  } else {
    emit('select', company.companyName)
  }
}

const handleCheckboxChange = (company: Company, checked: boolean) => {
  if (checked) {
    emit('select', company.companyName)
  } else {
    emit('select', null)
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="rounded-md border bg-card text-card-foreground shadow-sm">
      <Table>
        <TableHeader>
          <TableRow class="bg-muted/50 hover:bg-muted/50">
            <TableHead class="w-[50px]" />
            <TableHead class="w-[80px]">
              <span class="text-xs font-semibold text-muted-foreground">No</span>
            </TableHead>
            <TableHead>
              <button
                @click="handleSort('companyName')"
                class="flex items-center gap-1 text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
                :class="sortKey === 'companyName' ? 'text-foreground' : 'text-muted-foreground'"
              >
                Name <SortIcon class="w-3 h-3" />
              </button>
            </TableHead>
            <TableHead>
              <button
                @click="handleSort('companyAverage')"
                class="flex items-center gap-1 text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
                :class="sortKey === 'companyAverage' ? 'text-foreground' : 'text-muted-foreground'"
              >
                Company average <SortIcon class="w-3 h-3" />
              </button>
            </TableHead>
            <TableHead>
              <button
                @click="handleSort('currentActiveDrivers')"
                class="flex items-center gap-1 text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
                :class="sortKey === 'currentActiveDrivers' ? 'text-foreground' : 'text-muted-foreground'"
              >
                Current quantity <SortIcon class="w-3 h-3" />
              </button>
            </TableHead>
            <TableHead class="w-[300px]">
              <button
                @click="handleSort('totalDrivers')"
                class="flex items-center gap-1 text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
                :class="sortKey === 'totalDrivers' ? 'text-foreground' : 'text-muted-foreground'"
              >
                Total <SortIcon class="w-3 h-3" />
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="(company, index) in paginatedCompanies"
            :key="index"
            class="cursor-pointer"
            :class="{
              'bg-primary/10': selectedCompanyName === company.companyName,
            }"
            @click="handleRowClick(company)"
          >
            <TableCell @click.stop>
              <CCustomCheckbox
                :checked="selectedCompanyName === company.companyName"
                @update:checked="(checked) => handleCheckboxChange(company, checked)"
              />
            </TableCell>
            <TableCell>{{ (currentPage - 1) * pageSize + index + 1 }}</TableCell>
            <TableCell>{{ company.companyName }}</TableCell>
            <TableCell>{{ company.companyAverage }}</TableCell>
            <TableCell>{{ company.currentActiveDrivers }}</TableCell>
            <TableCell>
              <div class="space-y-2">
                <span class="font-medium">{{ company.totalDrivers }}</span>
                <Progress
                  :model-value="Math.round((company.totalDrivers / maxTotal) * 100)"
                  class="h-2"
                />
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="paginatedCompanies.length === 0">
            <TableCell colspan="6" class="text-center py-8 text-muted-foreground">
              No companies found
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between px-2">
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Display on page</span>
        <Select
          :model-value="pageSize.toString()"
          @update:model-value="(v) => { pageSize = Number(v); currentPage = 1 }"
        >
          <SelectTrigger class="h-8 w-[70px]">
            <SelectValue :placeholder="pageSize.toString()" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span>{{ companies.length }} entries</span>
      </div>

      <div class="flex items-center gap-6 lg:gap-8">
        <div class="flex items-center gap-2">
          <Button
            variant="ghost"
            class="h-8 w-8 p-0"
            :disabled="currentPage === 1"
            @click="currentPage = 1"
          >
            <span class="sr-only">Go to first page</span>
            <ChevronsLeft class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            class="h-8 w-8 p-0"
            :disabled="currentPage === 1"
            @click="currentPage--"
          >
            <span class="sr-only">Go to previous page</span>
            <ChevronLeft class="h-4 w-4" />
          </Button>

          <div class="flex items-center gap-2 text-sm font-medium">
            <Button
              v-for="page in Math.min(5, totalPages)"
              :key="page"
              variant="ghost"
              size="sm"
              :class="{ 'font-bold': currentPage === page }"
              @click="currentPage = page"
            >
              {{ page }}
            </Button>
            <span v-if="totalPages > 5">...</span>
            <Button
              v-if="totalPages > 5"
              variant="ghost"
              size="sm"
              :class="{ 'font-bold': currentPage === totalPages }"
              @click="currentPage = totalPages"
            >
              {{ totalPages }}
            </Button>
          </div>

          <Button
            variant="ghost"
            class="h-8 w-8 p-0"
            :disabled="currentPage === totalPages"
            @click="currentPage++"
          >
            <span class="sr-only">Go to next page</span>
            <ChevronRight class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            class="h-8 w-8 p-0"
            :disabled="currentPage === totalPages"
            @click="currentPage = totalPages"
          >
            <span class="sr-only">Go to last page</span>
            <ChevronsRight class="h-4 w-4" />
          </Button>
        </div>
        <div class="flex w-[100px] items-center justify-center text-sm font-medium">
          {{ currentPage }} of {{ totalPages }} pages
        </div>
      </div>
    </div>
  </div>
</template>
