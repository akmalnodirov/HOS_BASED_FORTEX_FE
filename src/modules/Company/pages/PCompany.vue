<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <div class="text-gray-600 dark:text-gray-400">Loading...</div>
    </div>

    <div v-else class="space-y-6">
      <!-- Header -->
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Company</h2>
      </div>

      <!-- General Information Section -->
      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
      >
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          GENERAL INFORMATION
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="space-y-1">
            <p class="text-sm text-gray-500 dark:text-gray-400">Company ID</p>
            <div
              class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
            >
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ company.companyId }}
              </p>
            </div>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-gray-500 dark:text-gray-400">Company name</p>
            <div
              class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
            >
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ company.companyName }}
              </p>
            </div>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-gray-500 dark:text-gray-400">DOT number</p>
            <div
              class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
            >
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ company.dotNumber }}
              </p>
            </div>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-gray-500 dark:text-gray-400">Time Zone</p>
            <div
              class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
            >
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ company.timeZone }}
              </p>
            </div>
          </div>

          <div class="space-y-1">
            <p class="text-sm text-gray-500 dark:text-gray-400">Company address</p>
            <div
              class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
            >
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ company.address }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Company Settings Section -->
      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
      >
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          CARRIER SETTINGS
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="space-y-1">
            <p class="text-sm text-gray-500 dark:text-gray-400">Cycle Rule</p>
            <div
              class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
            >
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ company.hosRoles }}
              </p>
            </div>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-gray-500 dark:text-gray-400">Cargo Type</p>
            <div
              class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
            >
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ company.cargoType }}
              </p>
            </div>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-gray-500 dark:text-gray-400">Restart</p>
            <div
              class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
            >
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ company.restart }}
              </p>
            </div>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-gray-500 dark:text-gray-400">Short-Haul Exception</p>
            <div
              class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
            >
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ company.shortHaulException ? 'Allowed' : 'Forbidden' }}
              </p>
            </div>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-gray-500 dark:text-gray-400">Personal Conveyance</p>
            <div
              class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
            >
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ company.allowPersonalUse ? 'Allowed' : 'Forbidden' }}
              </p>
            </div>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-gray-500 dark:text-gray-400">Yard moves</p>
            <div
              class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
            >
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ company.allowYardMoves ? 'Allowed' : 'Forbidden' }}
              </p>
            </div>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-gray-500 dark:text-gray-400">Exempt Driver</p>
            <div
              class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
            >
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ company.exemptDriver ? 'Allowed' : 'Forbidden' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Terminals Section -->
      <div
        v-for="(terminal, index) in company.terminals"
        :key="terminal.id"
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
      >
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {{ terminal.name }}
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="space-y-1">
            <p class="text-sm text-gray-500 dark:text-gray-400">Terminal address</p>
            <div
              class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
            >
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ terminal.address }}
              </p>
            </div>
          </div>
          <div v-if="terminal.zipCode" class="space-y-1">
            <p class="text-sm text-gray-500 dark:text-gray-400">Zip code</p>
            <div
              class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
            >
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ terminal.zipCode }}
              </p>
            </div>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-gray-500 dark:text-gray-400">Time zone</p>
            <div
              class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
            >
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ terminal.timeZone }}
              </p>
            </div>
          </div>
          <div v-if="terminal.periodStartingTime" class="space-y-1">
            <p class="text-sm text-gray-500 dark:text-gray-400">24 Hour period starting time</p>
            <div
              class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
            >
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ terminal.periodStartingTime }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useCompany } from '@/modules/Company/composables/useCompany'

const { company, isLoading, loadCompany, initializeData } = useCompany()

onMounted(async () => {
  await initializeData()
  await loadCompany()
})
</script>
