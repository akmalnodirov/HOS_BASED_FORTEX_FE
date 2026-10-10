<template>
  <header
    class="fixed top-0 right-0 h-16.25 bg-background border-b border-gray-300 dark:border-border z-50 transition-all duration-300 flex items-center"
    :class="[isSidebarOpen ? 'left-62' : 'left-0']"
  >
    <!-- Header Content -->
    <div class="flex-1 h-full px-6 flex items-center justify-between">
      <!-- Left Section -->
      <div class="flex items-center gap-4">
        <!-- Burger Menu - only visible when sidebar is closed -->
        <Button
          v-if="!isSidebarOpen"
          @click="emit('toggle-sidebar')"
          variant="ghost"
          size="icon"
          class="h-10 w-10"
        >
          <Menu class="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </Button>

        <!-- Page Title -->
        <h1 class="text-sm ml-2 text-muted-foreground">
          <template v-if="pageTitle.includes('/')">
            {{ pageTitle.substring(0, pageTitle.lastIndexOf('/')) }}
            <span class="text-[#090909] dark:text-gray-100 font-medium">
              / {{ pageTitle.substring(pageTitle.lastIndexOf('/') + 1).trim() }}</span
            >
          </template>
          <template v-else>
            <span class="text-[#090909] dark:text-gray-100 font-medium">{{ pageTitle }}</span>
          </template>
        </h1>
      </div>

      <!-- Right Section -->
      <div class="flex items-center gap-2">
        <!-- Dark Mode Toggle -->
        <!--        <Button @click="toggleDarkMode" variant="ghost" size="icon" class="hidden sm:flex">-->
        <!--          <Sun v-if="!isDarkMode" class="w-5 h-5" />-->
        <!--          <Moon v-else class="w-5 h-5" />-->
        <!--        </Button>-->

        <!-- Messages -->
        <!--        <Button variant="ghost" size="icon" class="hidden sm:flex relative">-->
        <!--          <MessageSquare class="w-5 h-5" />-->
        <!--          <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>-->
        <!--        </Button>-->

        <!-- Company Dropdown -->
        <DropdownMenu v-model:open="isDropdownOpen">
          <DropdownMenuTrigger as-child>
            <Button
              variant="ghost"
              class="flex items-center gap-2 h-10 px-3 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div
                class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm"
              >
                {{ selectedCompanyName.charAt(0).toUpperCase() || 'C' }}
              </div>
              <span class="hidden sm:block text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ selectedCompanyName || 'Select company' }}
              </span>
              <ChevronsUpDown class="w-4 h-4 text-gray-500 dark:text-gray-400 hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            class="w-105 p-0 overflow-hidden rounded border-none shadow-xl"
            :side-offset="8"
          >
            <!-- Search Section -->
            <div class="p-4 flex items-center gap-2 bg-[#F0F0F0] dark:bg-muted">
              <div class="relative flex-1">
                <Search
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                />
                <Input
                  v-model="searchQuery"
                  placeholder="Search company"
                  class="pl-9 w-full bg-background dark:bg-card border-border h-10 rounded text-sm"
                />
              </div>
              <Button
                @click="toggleDarkMode"
                variant="ghost"
                size="icon"
                class="h-10 w-10 cursor-pointer shrink-0 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 text-gray-900 dark:text-gray-100 shadow-sm"
              >
                <Sun v-if="!isDarkMode" class="w-[18px] h-[18px]" />
                <Moon v-else class="w-[18px] h-[18px]" />
              </Button>
            </div>

            <div class="p-4 bg-background dark:bg-card">
              <!-- Companies List -->
              <div class="max-h-[320px] overflow-y-auto pr-1 flex flex-col gap-3">
                <div
                  v-if="isLoading"
                  class="py-8 flex items-center justify-center text-muted-foreground"
                >
                  <LoaderCircle class="h-5 w-5 animate-spin" />
                </div>
                <div
                  v-for="company in filteredCompanies"
                  :key="company.id"
                  class="flex items-center justify-between rounded border border-border p-3 transition-colors"
                  :class="[
                    selectedCompanyId === company.id ? 'bg-muted' : '',
                    company.isActive && !selectingCompanyId
                      ? 'cursor-pointer hover:bg-muted/50'
                      : 'cursor-not-allowed opacity-60',
                  ]"
                  @click="handleCompanySelection(company)"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-10 w-10 items-center justify-center rounded border border-border bg-muted"
                    >
                      <Building class="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div class="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {{ company.name }}
                      </div>
                      <div class="mt-0.5 text-xs font-medium text-gray-400 dark:text-gray-500">
                        USDOT: {{ company.dotNumber || '—' }}
                      </div>
                    </div>
                  </div>
                  <span
                    class="h-2 w-2 rounded-full"
                    :class="company.isActive ? 'bg-emerald-500' : 'bg-gray-300'"
                  ></span>
                  <LoaderCircle
                    v-if="selectingCompanyId === company.id"
                    class="h-4 w-4 animate-spin text-muted-foreground"
                  />
                </div>

                <div
                  v-if="!isLoading && filteredCompanies.length === 0"
                  class="py-8 text-center text-gray-400 dark:text-gray-500 text-sm font-medium"
                >
                  {{ error || 'No companies found' }}
                </div>
                <Button
                  v-if="hasMore"
                  variant="outline"
                  class="w-full"
                  :disabled="isLoadingMore"
                  @click.stop="loadCompanies(true)"
                >
                  <LoaderCircle v-if="isLoadingMore" class="mr-2 h-4 w-4 animate-spin" />
                  Load more
                </Button>
              </div>
            </div>

            <!-- User Profile Footer -->
            <div
              class="p-4 border-t border-border bg-background dark:bg-card flex items-center gap-2"
            >
              <div
                class="flex-1 flex items-center gap-3 bg-[#F0F0F0] dark:bg-muted border border-border py-2.5 px-4 rounded cursor-pointer hover:bg-accent transition-colors"
                @click="handleProfileClick"
              >
                <User class="w-[18px] h-[18px] text-[#090909] dark:text-gray-200" />
                <span class="text-sm font-semibold text-[#090909] dark:text-gray-100">
                  {{
                    authStore.user
                      ? `${authStore.user.firstName} ${authStore.user.lastName}`
                      : 'User'
                  }}
                  ({{ authStore.user?.roles?.[0]?.name || 'Admin' }})
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                class="h-11 w-11 flex-shrink-0 bg-[#F0F0F0] dark:bg-red-900/10 border border-[#DBDBDB] dark:border-red-900/30 rounded hover:bg-[#FFEBEB] group overflow-hidden"
                @click.stop="handleLogout"
              >
                <LogOut class="w-5 h-5 text-[#C53030] transition-transform group-hover:scale-110" />
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </header>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Menu,
  Sun,
  Moon,
  ChevronsUpDown,
  User,
  Settings,
  LogOut,
  Search,
  Building,
  LoaderCircle,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDarkMode } from '@/composables/useDarkMode'
import { useCompanySwitcher } from '@/layouts/Default/useCompanySwitcher'
import type { RouteEldCompany } from '@/types/company'
import { useAuthStore } from '@/modules/Auth/store/authStore'

const route = useRoute()
const router = useRouter()

const props = defineProps<{
  isSidebarOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-sidebar'): void
}>()

const { isDarkMode, toggleDarkMode } = useDarkMode()
const authStore = useAuthStore()

// Company dropdown state
const {
  companies,
  selectedCompanyId,
  selectedCompanyName,
  searchQuery,
  hasMore,
  isLoading,
  isLoadingMore,
  selectingCompanyId,
  error,
  loadCompanies,
  selectCompany,
} = useCompanySwitcher()
const isDropdownOpen = ref(false)
const filteredCompanies = computed(() => companies.value)

const handleCompanySelection = async (company: RouteEldCompany) => {
  if (!company.isActive) return
  if (company.id === selectedCompanyId.value) {
    isDropdownOpen.value = false
    return
  }
  if (selectingCompanyId.value) return
  const selected = await selectCompany(company)
  if (!selected) return
  isDropdownOpen.value = false
  window.location.assign('/eld/logs')
}

watch(isDropdownOpen, (open) => {
  if (open) loadCompanies()
})

// Page title based on route
const pageTitle = computed(() => {
  const path = route.path

  // Dynamic /logs/:id/* routes
  if (path.startsWith('/logs/')) {
    const subPage = path.split('/')[3] // undefined | 'boost' | 'tracking' | 'insert-info' | ...
    const subPageMap: Record<string, string> = {
      boost: 'Boost',
      tracking: 'Tracking',
      'insert-info': 'Insert Info',
      history: 'History',
      ai: 'AI',
    }
    const sub = subPage ? (subPageMap[subPage] ?? subPage) : 'Logs'
    return `ELD / ${sub}`
  }

  // Map routes to titles
  const titleMap: Record<string, string> = {
    '/overview': 'Overview',
    '/alerts': 'Alerts',
    '/vehicles': 'Vehicles',
    '/drivers': 'Drivers',
    '/ifta': 'IFTA',
    '/vehicle-reports': 'Vehicle reports',
    '/route-eld-alerts': 'Alerts',
    '/company': 'Company',
    '/portal-users': 'Portal Users',

    // ELD routes
    '/eld/logs': 'ELD / Logs',
    '/eld/event-sessions': 'ELD / Event Sessions',
    '/eld/unidentified': 'ELD / Event Sessions',
    '/eld/weight-stations': 'Weight stations',
    '/alpr-camera/route': 'ALPR Camera / Route',
    '/alpr-camera/history': 'ALPR Camera / History',

    // Tools routes
    '/tools/activity': 'Tools / Activity',
    '/tools/monitoring': 'Tools / Monitoring',
    '/tools/dot-inspection': 'Tools / DOT Inspection',
    '/tools/deletion-menu': 'Tools / Deletion Menu',
    '/tools/audit': 'Tools / Audit',
    '/tools/users': 'Tools / Users',
    '/tools/elds': 'Tools / ELDs',
    '/tools/statistic-admin': 'Tools / Statistic Admin',
    '/tools/statistic-company': 'Tools / Statistic Company',

    // Configuration routes
    '/config/issuer-states': 'Config / Issuer States',
    '/config/hos-rules': 'Config / HOS Rules',
    '/config/restarts': 'Config / Restart',
    '/config/rest-breaks': 'Config / Rest Breaks',
    '/config/cargo-types': 'Config / Cargo Types',
    '/config/vehicle-fuels': 'Config / Vehicle Fuels',
    '/tools/eld-connections': 'Config / ELD Connections',
    '/tools/maintenance-types': 'Config / Maintenance Types',

    // User Manager routes
    '/users/roles': 'Users / Roles',
    '/users/permissions': 'Users / Permissions',
  }

  return titleMap[path] || path
})

const handleProfileClick = () => {
  isDropdownOpen.value = false
  router.push('/profile')
}

const handleLogout = async () => {
  console.log('Logging out...')
  await authStore.logout()
}
</script>

<style scoped>
.max-h-\[400px\]::-webkit-scrollbar {
  width: 4px;
}

.max-h-\[400px\]::-webkit-scrollbar-track {
  background: transparent;
}

.max-h-\[400px\]::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}

.max-h-\[400px\]::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

/* Dark mode scrollbar */
:deep(.dark) .max-h-\[400px\]::-webkit-scrollbar-thumb {
  background: #4a5568;
}

:deep(.dark) .max-h-\[400px\]::-webkit-scrollbar-thumb:hover {
  background: #718096;
}

/* Search highlight - sariq rang */
:deep(mark) {
  background: linear-gradient(to right, #fde68a, #fcd34d);
  color: #000;
  padding: 0 2px;
  border-radius: 3px;
}
</style>
