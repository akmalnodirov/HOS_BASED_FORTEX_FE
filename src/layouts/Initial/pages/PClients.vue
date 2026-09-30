<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <div class="bg-card rounded-lg border border-border shadow-none">
      <!-- Title and Actions -->
      <div class="px-6 py-5 border-b border-border">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-semibold text-foreground">Clients</h2>

          <div class="flex items-center gap-3">
            <!-- Search Name -->
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              />
              <Input
                v-model="searchName"
                placeholder="Search name"
                class="pl-9 w-64 border-border text-foreground"
              />
            </div>

            <!-- Search Email -->
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              />
              <Input
                v-model="searchEmail"
                placeholder="Search email"
                class="pl-9 w-64 border-border text-foreground"
              />
            </div>

            <!-- Create Client Button -->
            <Button
              @click="openCreateModal"
              class="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Create Client
            </Button>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
        <Table>
          <TableHeader class="sticky top-0 z-10">
            <TableRow class="bg-[#F0F0F0] dark:bg-muted/50 hover:bg-[#F0F0F0] dark:hover:bg-muted/50">
              <TableHead class="w-20 text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase">
                <button
                  @click="handleSort('id')"
                  class="flex items-center gap-1 text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase hover:text-foreground cursor-pointer"
                >
                  No
                  <SortIcon class="w-4 h-4" />
                </button>
              </TableHead>
              <TableHead class="text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase">
                <button
                  @click="handleSort('name')"
                  class="flex items-center gap-1 text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase hover:text-foreground cursor-pointer"
                >
                  Client name
                  <SortIcon class="w-4 h-4" />
                </button>
              </TableHead>
              <TableHead class="text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase">
                <button
                  @click="handleSort('email')"
                  class="flex items-center gap-1 text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase hover:text-foreground cursor-pointer"
                >
                  Email
                  <SortIcon class="w-4 h-4" />
                </button>
              </TableHead>
              <TableHead class="text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase">
                <button
                  @click="handleSort('phone')"
                  class="flex items-center gap-1 text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase hover:text-foreground cursor-pointer"
                >
                  Phone
                  <SortIcon class="w-4 h-4" />
                </button>
              </TableHead>
              <TableHead class="text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase">
                <button
                  @click="handleSort('company')"
                  class="flex items-center gap-1 text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase hover:text-foreground cursor-pointer"
                >
                  Company
                  <SortIcon class="w-4 h-4" />
                </button>
              </TableHead>
              <TableHead class="text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase text-right">
                <button
                  @click="handleSort('status')"
                  class="flex items-center gap-1 text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase hover:text-foreground ml-auto cursor-pointer"
                >
                  Status
                  <SortIcon class="w-4 h-4" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="client in paginatedClients"
              :key="client.id"
              @click="handleRowClick(client)"
              class="cursor-pointer hover:bg-accent/50 border-b border-border/50 transition-colors"
            >
              <TableCell class="font-medium">{{ client.id }}</TableCell>
              <TableCell>{{ client.name }}</TableCell>
              <TableCell>{{ client.email }}</TableCell>
              <TableCell>{{ client.phone }}</TableCell>
              <TableCell>{{ client.company }}</TableCell>
              <TableCell class="text-right">
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    client.status === 'Active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400'
                      : 'bg-muted text-muted-foreground',
                  ]"
                >
                  {{ client.status }}
                </span>
              </TableCell>
            </TableRow>

            <!-- No results -->
            <TableRow v-if="paginatedClients.length === 0">
              <TableCell colspan="6" class="text-center py-8 text-muted-foreground">
                No clients found
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Footer / Pagination -->
      <div class="px-6 py-4 border-t border-border flex items-center justify-between">
        <!-- Items per page -->
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
          <span class="text-sm text-muted-foreground"> {{ totalEntries }} entries </span>
        </div>

        <!-- Pagination -->
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1">
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

          <div class="flex items-center gap-2 ml-4">
            <span class="text-sm text-muted-foreground">
              {{ currentPage }} of {{ totalPages }} pages
            </span>
            <div class="flex gap-1">
              <Button
                @click="goToPage(currentPage - 1)"
                :disabled="currentPage === 1"
                variant="outline"
                size="icon"
                class="h-8 w-8 border-border"
              >
                <ChevronLeft class="w-4 h-4" />
              </Button>
              <Button
                @click="goToPage(currentPage + 1)"
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

    <!-- Create Client Modal -->
    <CreateClientModal
      :open="isCreateModalOpen"
      @close="closeCreateModal"
      @submit="handleModalSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import SortIcon from '@/components/icons/SortIcon.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePagination } from '@/composables/usePagination'
import { sortArray, commonTransformers, type SortOrder } from '@/utils/sort'
import CreateClientModal from '@/layouts/Initial/components/CreateClientModal.vue'

const router = useRouter()

// Modal state
const isCreateModalOpen = ref(false)

interface Client {
  id: number
  name: string
  email: string
  phone: string
  company: string
  status: 'Active' | 'Inactive'
  createdAt: Date
}

// Mock data
const allClients = ref<Client[]>([
  {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@ibm.com',
    phone: '+1 (555) 123-4567',
    company: 'IBM',
    status: 'Active',
    createdAt: new Date('2025-01-07T22:09:00'),
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane.smith@disney.com',
    phone: '+1 (555) 234-5678',
    company: 'The Walt Disney Company',
    status: 'Active',
    createdAt: new Date('2025-01-07T22:09:00'),
  },
  {
    id: 3,
    name: 'Bob Johnson',
    email: 'bob.j@mcdonalds.com',
    phone: '+1 (555) 345-6789',
    company: "McDonald's",
    status: 'Inactive',
    createdAt: new Date('2025-01-06T15:30:00'),
  },
  {
    id: 4,
    name: 'Alice Williams',
    email: 'alice.w@lvmh.com',
    phone: '+1 (555) 456-7890',
    company: 'Louis Vuitton',
    status: 'Active',
    createdAt: new Date('2025-01-05T10:15:00'),
  },
  {
    id: 5,
    name: 'Charlie Brown',
    email: 'charlie.b@ebay.com',
    phone: '+1 (555) 567-8901',
    company: 'eBay',
    status: 'Active',
    createdAt: new Date('2025-01-04T14:20:00'),
  },
])

// Search filters
const searchName = ref('')
const searchEmail = ref('')

// Sorting
type SortKey = 'id' | 'name' | 'email' | 'phone' | 'company' | 'status'
const sortKey = ref<SortKey>('id')
const sortOrder = ref<SortOrder>('asc')

// Setup pagination
const pagination = usePagination(
  computed(() => filteredClients.value.length),
  {
    itemsPerPage: 10,
  }
)

// Debounced search
const debouncedSearchName = ref('')
const debouncedSearchEmail = ref('')
let searchTimeout: ReturnType<typeof setTimeout>

watch([searchName, searchEmail], () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    debouncedSearchName.value = searchName.value
    debouncedSearchEmail.value = searchEmail.value
    pagination.resetPage()
  }, 300)
})

// Filtered clients
const filteredClients = computed(() => {
  let filtered = allClients.value

  // Filter by name
  if (debouncedSearchName.value) {
    filtered = filtered.filter((client) =>
      client.name.toLowerCase().includes(debouncedSearchName.value.toLowerCase())
    )
  }

  // Filter by email
  if (debouncedSearchEmail.value) {
    filtered = filtered.filter((client) =>
      client.email.toLowerCase().includes(debouncedSearchEmail.value.toLowerCase())
    )
  }

  // Sort using generic utility
  sortArray(filtered, sortKey.value, sortOrder.value, {
    id: commonTransformers.toNumber,
  })

  return filtered
})

// Paginated clients
const paginatedClients = computed(() => pagination.paginateData(filteredClients.value))

// Re-export pagination properties for template
const { currentPage, itemsPerPage, totalPages, totalEntries, pageNumbers, goToPage } = pagination

// Functions
const handleSort = (key: SortKey) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

const handleRowClick = (client: Client) => {
  console.log('Client clicked:', client)
  // router.push(`/clients/${client.id}`)
}

// Modal actions
const openCreateModal = () => {
  isCreateModalOpen.value = true
}

const closeCreateModal = () => {
  isCreateModalOpen.value = false
}

const handleModalSubmit = async () => {
  // Refresh clients list if needed
  // For now, just close the modal
  // TODO: Implement API call to refresh clients
  console.log('Client created, refresh list')
}
</script>
