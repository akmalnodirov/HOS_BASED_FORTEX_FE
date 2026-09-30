<template>
  <div class="h-full flex flex-col bg-white p-[16px_24px]">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">Profile</h1>
    </div>

    <!-- Content -->
    <div class="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
      <!-- Left Sidebar: User Info -->
      <div class="w-full lg:w-[320px] 2xl:w-[380px] flex flex-col gap-4 flex-shrink-0">
        <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-2">
          {{ fullName }}
        </h2>

        <div class="space-y-3">
          <!-- Username -->
          <div class="bg-gray-50 dark:bg-muted p-4 rounded border border-gray-100 dark:border-border">
            <div class="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
              Username
            </div>
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ user?.userName || 'N/A' }}
            </div>
          </div>

          <!-- User ID -->
          <div class="bg-gray-50 dark:bg-muted p-4 rounded border border-gray-100 dark:border-border">
            <div class="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
              User ID
            </div>
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ user?.id || 'N/A' }}
            </div>
          </div>

          <!-- Role -->
          <div class="bg-gray-50 dark:bg-muted p-4 rounded border border-gray-100 dark:border-border">
            <div class="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
              Role
            </div>
            <div class="text-sm font-semibold text-blue-500 dark:text-blue-400">
              {{ rolesDisplay }}
            </div>
          </div>

          <!-- Email -->
          <div class="bg-gray-50 dark:bg-muted p-4 rounded border border-gray-100 dark:border-border">
            <div class="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
              Email
            </div>
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100 break-all">
              {{ user?.email || 'N/A' }}
            </div>
          </div>

          <!-- Phone number -->
          <div class="bg-gray-50 dark:bg-muted p-4 rounded border border-gray-100 dark:border-border">
            <div class="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
              Phone number
            </div>
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ user?.phoneNumber || 'N/A' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Right Content: Permissions -->
      <div class="flex-1 min-h-0 bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border flex flex-col shadow-sm">
        <!-- Permissions Header -->
        <div class="p-6 border-b border-gray-200 dark:border-border flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center gap-3">
            <h3 class="text-base font-bold text-gray-900 dark:text-gray-100">
              Permission ({{ allPermissions.length }})
            </h3>
            <span class="px-2.5 py-1 text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded uppercase tracking-wider border border-blue-100 dark:border-blue-800">
              Active roles ({{ user?.roles?.length || 0 }})
            </span>
            <span class="px-2.5 py-1 text-[10px] font-bold bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded uppercase tracking-wider border border-green-100 dark:border-green-800">
              Verified ({{ user?.state === 0 ? 'true' : 'false' }})
            </span>
          </div>
        </div>

        <!-- Permissions Grid -->
        <div class="flex-1 overflow-y-auto p-6">
          <div v-if="allPermissions.length > 0" class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
            <div 
              v-for="(permission, index) in allPermissions" 
              :key="permission.id || index"
              class="bg-gray-50 dark:bg-muted/50 p-4 rounded border border-gray-100 dark:border-border flex gap-4 items-start hover:shadow-md transition-shadow group"
            >
              <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {{ index + 1 }}
              </div>
              <div class="text-xs font-medium text-gray-600 dark:text-gray-300 leading-relaxed pt-1">
                {{ permission.name || permission }}
              </div>
            </div>
          </div>
          <div v-else class="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 py-12">
            <div class="w-16 h-16 rounded-full bg-gray-50 dark:bg-muted mb-4 flex items-center justify-center">
              <ShieldAlert class="w-8 h-8 opacity-20" />
            </div>
            <p class="text-sm font-medium">No permissions assigned to this user</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { ShieldAlert } from 'lucide-vue-next'

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const fullName = computed(() => {
  if (!user.value) return 'N/A'
  return `${user.value.firstName} ${user.value.lastName}`.trim() || user.value.userName
})

const rolesDisplay = computed(() => {
  if (!user.value?.roles?.length) return 'N/A'
  return user.value.roles.map(r => r.name).join(', ')
})

const allPermissions = computed(() => {
  if (!user.value?.roles) return []
  
  // Flatten permissions from all roles
  const permissions = user.value.roles.flatMap(role => role.permissions || [])
  
  // If API permissions are empty, but image shows samples, 
  // we might want to show something if this is for demo, 
  // but better to show real data. 
  // If the user provided an example response where permissions is empty, 
  // it might be empty for that specific user.
  
  return permissions
})
</script>

<style scoped>
/* Custom scrollbar for permissions area */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}

:deep(.dark) .overflow-y-auto::-webkit-scrollbar-thumb {
  background: #334155;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>
