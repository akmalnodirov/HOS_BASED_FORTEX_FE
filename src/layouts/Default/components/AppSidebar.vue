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

      <Separator class="bg-gray-300 dark:bg-sidebar-border" />

      <nav class="flex-1 overflow-y-auto py-4 px-2">
        <div v-for="section in menuItems" :key="section.id" class="mb-6">
          <div
            v-if="isOpen"
            class="px-3 mb-2 text-xs font-semibold text-gray-600 dark:text-sidebar-foreground/70 uppercase tracking-wider"
          >
            {{ section.label }}
          </div>

          <div class="space-y-1">
            <template v-for="item in section.children" :key="item.id">
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
                  <img
                    v-if="typeof item.icon === 'string'"
                    :src="item.icon"
                    alt=""
                    class="h-5 w-5 flex-shrink-0 sidebar-icon"
                  />
                  <component :is="item.icon" v-else-if="item.icon" class="h-5 w-5 flex-shrink-0" />
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

                <div
                  v-show="isMenuExpanded(item.id) && isOpen"
                  class="ml-8 mt-1 space-y-1 relative"
                >
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
                <img
                  v-if="typeof item.icon === 'string'"
                  :src="item.icon"
                  alt=""
                  class="h-5 w-5 flex-shrink-0 sidebar-icon"
                />
                <component
                  :is="item.icon"
                  v-else-if="item.icon"
                  class="h-5 w-5 flex-shrink-0"
                  aria-hidden="true"
                />
                <span v-show="isOpen">{{ item.label }}</span>
              </button>
            </template>
          </div>
        </div>
      </nav>

      <Separator class="bg-gray-300 dark:bg-sidebar-border" />

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

<script setup lang="ts">
import { ref, onMounted, watch, type Component } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { FileBarChart2, LogOut, ChevronDown, Scale } from 'lucide-vue-next'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/modules/Auth/store/authStore'

interface MenuItem {
  id: string
  label: string
  icon: string | Component | null
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
        id: 'alpr-camera',
        label: 'ALPR Camera',
        icon: '/icons/map.svg',
        children: [
          { id: 'alpr-camera-route', label: 'Route', icon: null, path: '/alpr-camera/route' },
          { id: 'alpr-camera-history', label: 'History', icon: null, path: '/alpr-camera/history' },
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
        id: 'weight-stations',
        label: 'Weight stations',
        icon: Scale,
        path: '/eld/weight-stations',
      },
      {
        id: 'vehicle-reports',
        label: 'Vehicle reports',
        icon: FileBarChart2,
        path: '/vehicle-reports',
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
        id: 'users',
        label: 'Users',
        icon: '/icons/user.svg',
        path: '/users',
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
          { id: 'tools-monitoring', label: 'Monitoring', icon: null, path: '/tools/monitoring' },
          {
            id: 'tools-dot-inspection',
            label: 'DOT inspection',
            icon: null,
            path: '/tools/dot-inspection',
          },
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
  await authStore.logout()
}
</script>

<style scoped>
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

.dark .sidebar-icon {
  filter: brightness(0) invert(1);
  opacity: 0.9;
}
</style>
