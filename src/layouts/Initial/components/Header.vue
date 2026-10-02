<template>
  <header class="bg-white dark:bg-black/15 border-b border-gray-200 dark:border-border">
    <div class="px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 flex items-center justify-center">
          <img src="/images/logo.svg" alt="Logo" class="dark:hidden" />
          <img src="/images/logo-white.svg" alt="Logo" class="hidden dark:block" />
        </div>
        <h1 class="text-xl text-gray-900 dark:text-gray-100">Unione</h1>
      </div>

      <div class="flex items-center gap-4">
        <!-- Tabs Navigation -->
        <Tabs :model-value="currentTab" @update:model-value="handleTabChange">
          <TabsList class="bg-[#F0F0F0] dark:bg-gray-800">
            <TabsTrigger
              class="cursor-pointer text-[#666] dark:text-gray-400 data-[state=active]:font-medium data-[state=active]:text-[#090909] dark:data-[state=active]:text-gray-100 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              value="/initial/companies"
            >
              Companies
            </TabsTrigger>
            <TabsTrigger
              class="cursor-pointer text-[#666] dark:text-gray-400 data-[state=active]:font-medium data-[state=active]:text-[#090909] dark:data-[state=active]:text-gray-100 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              value="/initial/clients"
            >
              Manage client
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <CThemeToggle />

        <!-- Unione Team Button -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="secondary" class="cursor-pointer bg-[#F0F0F0] dark:bg-gray-800">
              <span class="hidden sm:block text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ userInfo.name }}
              </span>
              <ChevronDown class="w-4 h-4 text-gray-500 dark:text-gray-400 hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-34">
            <DropdownMenuItem class="cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-800">
              <User class="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
              <span class="text-gray-900 dark:text-gray-100">{{ userInfo.id }}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              @click="handleLogout"
              class="cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-800 focus:text-gray-900 dark:focus:text-gray-100"
            >
              <LogOut class="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
              <span class="text-gray-900 dark:text-gray-100">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, LogOut, ChevronDown } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import CThemeToggle from '@/components/custom/CThemeToggle.vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/modules/Auth/store/authStore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const currentTab = computed(() => route.path)

const userInfo = ref({
  id: '001',
  name: 'Unione team',
  email: 'walt@disney.com',
})

const handleLogout = async () => {
  // Use authStore logout method to clear all auth data
  await authStore.logout()
}

const handleTabChange = (value) => {
  if (typeof value === 'string' && value !== route.path) {
    router.push(value)
  }
}
</script>
