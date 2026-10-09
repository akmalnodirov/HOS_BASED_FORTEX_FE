<template>
  <aside
    :class="[
      'fixed left-0 top-0 h-full bg-[#F0F0F0] dark:bg-sidebar transition-all duration-300 z-40 overflow-hidden',
      isOpen ? 'w-[248px] translate-x-0' : 'w-0 -translate-x-full lg:w-0 lg:translate-x-0',
    ]"
  >
    <div class="flex flex-col h-full w-[248px]">
      <!-- Logo -->
      <div class="flex items-center gap-3 px-4 h-[65px] flex-shrink-0">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
          <img src="/images/logo.svg" alt="Logo" class="w-5 h-5 dark:hidden" />
          <img src="/images/logo-white.svg" alt="Logo" class="w-5 h-5 hidden dark:block" />
        </div>
        <span
          v-show="isOpen"
          class="text-xl font-semibold text-gray-900 dark:text-sidebar-foreground whitespace-nowrap"
        >
          Unione ELD
        </span>
      </div>

      <!-- Separator aligned with header border -->
      <Separator class="bg-gray-300 dark:bg-sidebar-border" />

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto py-4 px-2">
        <div v-for="section in menuItems" :key="section.id" class="mb-6">
          <!-- Section Header -->
          <div
            v-if="isOpen"
            class="px-3 mb-2 text-xs font-semibold text-gray-600 dark:text-sidebar-foreground/70 uppercase tracking-wider"
          >
            {{ section.label }}
          </div>

          <!-- Menu Items -->
          <div class="space-y-1">
            <template v-for="item in section.children" :key="item.id">
              <!-- Parent Menu Item with Children -->
              <div v-if="item.children">
                <button
                  @click="toggleMenu(item.id)"
                  class="cursor-pointer"
                  :class="[
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    hasActiveChild(item)
                      ? 'bg-[#e6e6e6] dark:bg-sidebar-accent text-gray-900 dark:text-sidebar-accent-foreground'
                      : 'hover:bg-[#e6e6e6] dark:hover:bg-sidebar-accent text-gray-800 dark:text-sidebar-foreground',
                  ]"
                >
                  <img :src="item.icon" alt="" class="w-5 h-5 flex-shrink-0 sidebar-icon" />
                  <!--                  <component v-if="item.icon" :is="item.icon" class="w-5 h-5 flex-shrink-0" />-->
                  <span
                    v-show="isOpen"
                    class="flex-1 text-left"
                    :class="{ uppercase: item.uppercase }"
                  >
                    {{ item.label }}
                  </span>
                  <ChevronDown
                    v-show="isOpen"
                    :class="[
                      'w-4 h-4 transition-transform flex-shrink-0',
                      isMenuExpanded(item.id) && 'rotate-180',
                    ]"
                  />
                </button>

                <!-- Sub Menu Items -->
                <div
                  v-show="isMenuExpanded(item.id) && isOpen"
                  class="ml-8 mt-1 space-y-1 relative"
                >
                  <!-- Vertical line connecting to parent -->
                  <div
                    class="absolute -left-3 top-0 bottom-0 w-[1px] bg-[#dbdbdb] dark:bg-sidebar-border"
                  ></div>

                  <button
                    v-for="subItem in item.children"
                    :key="subItem.id"
                    @click="navigateTo(subItem.path)"
                    class="cursor-pointer relative"
                    :class="[
                      'w-full flex items-center gap-3 px-3 ml-1 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive(subItem.path, subItem.relatedPaths)
                        ? 'bg-[#e6e6e6] dark:bg-sidebar-accent text-gray-900 dark:text-sidebar-accent-foreground'
                        : 'text-gray-700 dark:text-sidebar-foreground/80 hover:bg-[#e6e6e6] dark:hover:bg-sidebar-accent/50',
                      item.uppercase && 'uppercase',
                    ]"
                  >
                    {{ subItem.label }}
                  </button>
                </div>
              </div>

              <!-- Simple Menu Item without Children -->
              <button
                v-else
                @click="navigateTo(item.path)"
                class="cursor-pointer"
                :class="[
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(item.path)
                    ? 'bg-[#e6e6e6] dark:bg-sidebar-accent text-gray-900 dark:text-sidebar-accent-foreground'
                    : 'text-gray-800 dark:text-sidebar-foreground hover:bg-[#e6e6e6] dark:hover:bg-sidebar-accent/50',
                ]"
              >
                <img :src="item.icon" alt="" class="w-5 h-5 flex-shrink-0 sidebar-icon" />
                <!--                <component v-if="item.icon" :is="item.icon" class="w-5 h-5 flex-shrink-0" />-->
                <span v-show="isOpen">{{ item.label }}</span>
              </button>
            </template>
          </div>
        </div>
      </nav>

      <Separator class="bg-gray-300 dark:bg-sidebar-border" />

      <!-- Logout Button -->
      <button
        @click="handleLogout"
        :class="[
          'w-full cursor-pointer rounded-none text-base flex items-center justify-start gap-2 text-white bg-[#AF4B4B] hover:bg-[#9a4040] transition-colors !px-6 !py-3',
          !isOpen && 'justify-center px-0',
        ]"
      >
        <LogOut class="w-4.5 h-4.5" />
        <span class="text-sm">Log out</span>
      </button>
    </div>
  </aside>
</template>
<!-- src/components/layout/AppSidebar.vue -->
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { LogOut, ChevronDown } from 'lucide-vue-next'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/modules/Auth/store/authStore'

interface MenuItem {
  id: string
  label: string
  icon: any
  path?: string
  uppercase?: boolean
  relatedPaths?: string[]
  children?: MenuItem[]
}

defineProps<{
  isOpen: boolean
}>()

const router = useRouter()
const route = useRoute()

const expandedMenus = ref<string[]>([])

const menuItems: MenuItem[] = [
  {
    id: 'operations',
    label: 'Operations',
    icon: null,
    children: [
      {
        id: 'overview',
        label: 'Overview',
        icon: '/icons/map.svg',
        path: '/overview',
      },
      {
        id: 'eld',
        label: 'ELD',
        icon: '/icons/menu.svg',
        children: [
          {
            id: 'eld-logs',
            label: 'Logs',
            icon: null,
            path: '/eld/logs',
            relatedPaths: ['/logs/'],
          },
          {
            id: 'eld-event-sessions',
            label: 'Event Sessions',
            icon: null,
            path: '/eld/event-sessions',
          },
        ],
      },
      {
        id: 'vehicles',
        label: 'Vehicles',
        icon: '/icons/truck.svg',
        path: '/vehicles',
      },
      {
        id: 'drivers',
        label: 'Drivers',
        icon: '/icons/users.svg',
        path: '/drivers',
      },
      {
        id: 'alerts',
        label: 'Alerts',
        icon: '/icons/bell.svg',
        path: '/alerts',
      },
      {
        id: 'chat',
        label: 'Chat',
        icon: '/icons/message-circle.svg',
        path: '/chat',
      },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance & Reports',
    icon: null,
    children: [
      {
        id: 'ifta',
        label: 'IFTA',
        icon: '/icons/ifta.svg',
        path: '/ifta',
      },
      {
        id: 'route-eld-alerts',
        label: 'Alerts',
        icon: '/icons/bell.svg',
        path: '/route-eld-alerts',
      },
      {
        id: 'company',
        label: 'Company',
        icon: '/icons/bank.svg',
        path: '/company',
      },
      {
        id: 'portal-users',
        label: 'Portal Users',
        icon: '/icons/user.svg',
        path: '/portal-users',
      },
    ],
  },
  {
    id: 'admin',
    label: 'Administration & Support',
    icon: null,
    children: [
      {
        id: 'tools',
        label: 'Tools',
        icon: '/icons/users.svg',
        uppercase: true,
        children: [
          { id: 'tools-activity', label: 'Activity', icon: null, path: '/tools/activity' },
          { id: 'tools-monitoring', label: 'Monitoring', icon: null, path: '/tools/monitoring' },
          {
            id: 'tools-dot-inspection',
            label: 'DOT inspection',
            icon: null,
            path: '/tools/dot-inspection',
          },
          {
            id: 'tools-deletion-menu',
            label: 'Deletion Menu',
            icon: null,
            path: '/tools/deletion-menu',
          },
          { id: 'tools-audit', label: 'Audit', icon: null, path: '/tools/audit' },
          { id: 'tools-users', label: 'Users', icon: null, path: '/tools/users' },
          { id: 'tools-elds', label: 'ELDs', icon: null, path: '/tools/elds' },
          {
            id: 'tools-statistic-admin',
            label: 'Statistic Admin',
            icon: null,
            path: '/tools/statistic-admin',
          },
          {
            id: 'tools-statistic-company',
            label: 'Statistic Company',
            icon: null,
            path: '/tools/statistic-company',
          },
        ],
      },
      {
        id: 'configuration',
        label: 'Configuration',
        icon: '/icons/gear.svg',
        uppercase: true,
        children: [
          {
            id: 'config-issuer-states',
            label: 'Issuer States',
            icon: null,
            path: '/config/issuer-states',
          },
          { id: 'config-hos-rules', label: 'HOS Rules', icon: null, path: '/config/hos-rules' },
          { id: 'config-restarts', label: 'Restart', icon: null, path: '/config/restarts' },
          {
            id: 'config-rest-breaks',
            label: 'Rest Breaks',
            icon: null,
            path: '/config/rest-breaks',
          },
          {
            id: 'config-cargo-types',
            label: 'Cargo Types',
            icon: null,
            path: '/config/cargo-types',
          },
          {
            id: 'config-vehicle-fuels',
            label: 'Vehicle Fuels',
            icon: null,
            path: '/config/vehicle-fuels',
          },
          {
            id: 'tools-eld-connections',
            label: 'ELD Connections',
            icon: null,
            path: '/tools/eld-connections',
          },
          {
            id: 'tools-maintenance-types',
            label: 'Maintenance Types',
            icon: null,
            path: '/tools/maintenance-types',
          },
        ],
      },
      {
        id: 'user-manager',
        label: 'User manager',
        icon: '/icons/menu.svg',
        uppercase: true,
        children: [
          { id: 'users-roles', label: 'Roles', icon: null, path: '/users/roles' },
          { id: 'users-permissions', label: 'Permissions', icon: null, path: '/users/permissions' },
        ],
      },
    ],
  },
]

// Load expanded menus from localStorage - disabled to keep menus collapsed by default
// onMounted(() => {
//   const saved = localStorage.getItem('expanded-menus')
//   if (saved) {
//     expandedMenus.value = JSON.parse(saved)
//   }
// })

// Save expanded menus to localStorage
watch(
  expandedMenus,
  (newValue) => {
    localStorage.setItem('expanded-menus', JSON.stringify(newValue))
  },
  { deep: true }
)

const toggleMenu = (menuId: string) => {
  const index = expandedMenus.value.indexOf(menuId)
  if (index > -1) {
    expandedMenus.value.splice(index, 1)
  } else {
    expandedMenus.value.push(menuId)
  }
}

const isMenuExpanded = (menuId: string) => {
  return expandedMenus.value.includes(menuId)
}

const isActive = (path?: string, relatedPaths?: string[]) => {
  if (!path) return false
  if (route.path === path || route.path.startsWith(path + '/')) return true
  return relatedPaths?.some((p) => route.path === p || route.path.startsWith(p)) ?? false
}

const hasActiveChild = (item: MenuItem): boolean => {
  if (!item.children) return false
  return item.children.some(
    (child) => isActive(child.path, child.relatedPaths) || hasActiveChild(child)
  )
}

const navigateTo = (path?: string) => {
  if (path) {
    router.push(path)
  }
}

const authStore = useAuthStore()

const handleLogout = async () => {
  // Use authStore logout method to clear all auth data
  await authStore.logout()
}
</script>

<style scoped>
/* Custom scrollbar */
nav::-webkit-scrollbar {
  width: 6px;
}

nav::-webkit-scrollbar-track {
  background: transparent;
}

nav::-webkit-scrollbar-thumb {
  background: #b0b0b0;
  border-radius: 3px;
}

.dark nav::-webkit-scrollbar-thumb {
  background: #4a4a4a;
}

nav::-webkit-scrollbar-thumb:hover {
  background: #999999;
}

.dark nav::-webkit-scrollbar-thumb:hover {
  background: #5a5a5a;
}

/* Icon styling for dark mode */
.dark .sidebar-icon {
  filter: brightness(0) invert(1);
  opacity: 0.9;
}
</style>
