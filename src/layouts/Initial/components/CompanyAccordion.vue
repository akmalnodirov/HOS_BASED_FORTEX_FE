<!-- src/components/companies/CompaniesAccordion.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { PackageOpen, Pencil, ChevronDown, ChevronRight } from 'lucide-vue-next'
import SortIcon from '@/components/icons/SortIcon.vue'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import type { Provider } from '@/types/company'
import { SortKey, SortOrder } from '@/layouts/Initial/composables/useCompanies.ts'
import { setCarrierId, setCarrierTimeZoneId } from '@/utils/carrier'
import type { Carrier } from '@/types/company'

interface Props {
  providers: Provider[]
  sortKey: SortKey
  sortOrder: SortOrder
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'sort', key: SortKey): void
  (e: 'toggle-carrier-status', providerId: string, carrierId: string): void
  (e: 'edit-carrier', providerId: string, carrierId: string): void
}>()

const router = useRouter()

// Track open accordion items
const openItems = ref<string[]>([])

const isOpen = (providerId: string) => {
  return openItems.value.includes(`provider-${providerId}`)
}

// Inner carriers table sorting
type CarrierSortKey = 'name' | 'usdotNumber' | 'email' | 'phoneNumber' | 'shortName' | 'displayName'

const carrierSortKey = ref<CarrierSortKey | null>(null)
const carrierSortOrder = ref<'asc' | 'desc'>('asc')

const handleCarrierSort = (key: CarrierSortKey) => {
  if (carrierSortKey.value === key) {
    carrierSortOrder.value = carrierSortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    carrierSortKey.value = key
    carrierSortOrder.value = 'asc'
  }
}

const sortedCarriers = (carriers: Carrier[]) => {
  if (!carrierSortKey.value) return carriers
  const key = carrierSortKey.value
  const order = carrierSortOrder.value === 'asc' ? 1 : -1
  return [...carriers].sort((a, b) => {
    let valA: string
    let valB: string
    if (key === 'shortName') {
      valA = a.timeZoneInfo?.shortName || ''
      valB = b.timeZoneInfo?.shortName || ''
    } else if (key === 'displayName') {
      valA = a.timeZoneInfo?.displayName || ''
      valB = b.timeZoneInfo?.displayName || ''
    } else {
      valA = (a[key] as string) || ''
      valB = (b[key] as string) || ''
    }
    return valA.localeCompare(valB) * order
  })
}

const handleCarrierClick = (carrier: Carrier) => {
  setCarrierId(carrier.carrierId)
  // Set carrier timezone from timeZoneInfo.ianaId
  if (carrier.timeZoneInfo?.ianaId) {
    setCarrierTimeZoneId(carrier.timeZoneInfo.ianaId)
  }
  router.push('/eld/logs')
}
</script>

<template>
  <div>
    <!-- Table Header -->
    <div class="bg-[#F0F0F0] dark:bg-muted/50 mb-1 rounded-lg">
      <div class="grid grid-cols-12 gap-4 px-6 py-3">
        <div class="col-span-1 flex items-center">
          <span class="text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase"
            >No</span
          >
        </div>
        <div class="col-span-4 flex items-center">
          <button
            @click="emit('sort', 'providerName')"
            class="flex items-center gap-1 text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase hover:text-foreground"
          >
            Company name <SortIcon class="w-4 h-4" />
          </button>
        </div>
        <div class="col-span-2 flex items-center">
          <span class="text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase"
            >USDOT</span
          >
        </div>
        <div class="col-span-3 flex items-center">
          <span class="text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase"
            >Address</span
          >
        </div>
        <div class="col-span-2 flex items-center justify-end">
          <button
            @click="emit('sort', 'carrierCount')"
            class="flex items-center gap-1 text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase hover:text-foreground"
          >
            Carriers count <SortIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Accordion Items -->
    <Accordion type="multiple" v-model="openItems" class="w-full">
      <AccordionItem
        v-for="(provider, index) in providers"
        :key="provider.providerId"
        :value="`provider-${provider.providerId}`"
        class="mb-1"
      >
        <AccordionTrigger
          class="hover:no-underline px-6 py-3 hover:bg-accent/50 cursor-pointer"
          :class="[isOpen(provider.providerId) ? 'bg-accent/20' : '']"
        >
          <div class="w-full">
            <div class="grid grid-cols-12 gap-4 w-full text-left items-center justify-between">
              <div class="col-span-1 flex items-center gap-2">
                <ChevronDown
                  :class="[
                    'h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground',
                    isOpen(provider.providerId) ? 'rotate-180' : '',
                  ]"
                />
              </div>
              <div class="col-span-4">
                <span class="text-sm font-medium text-foreground">
                  {{ provider.providerName }}
                </span>
              </div>
              <div class="col-span-2">
                <span class="text-sm text-muted-foreground">-</span>
              </div>
              <div class="col-span-3">
                <span class="text-sm text-muted-foreground">-</span>
              </div>
              <div class="col-span-2 flex justify-end">
                <span class="text-sm font-medium text-primary px-4 py-1 bg-primary/10 rounded">
                  {{ provider.carriers.length }}
                </span>
              </div>
            </div>
            <AccordionContent>
              <!-- Nested Carriers Table -->
              <div class="bg-card/50 py-4">
                <!-- Empty State -->
                <div
                  v-if="provider.carriers.length === 0"
                  class="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div
                    class="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"
                  >
                    <PackageOpen class="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p class="text-sm font-medium text-foreground mb-1">No carriers found</p>
                  <p class="text-sm text-muted-foreground">
                    This provider doesn't have any carriers yet.
                  </p>
                </div>

                <!-- Carriers Table -->
                <div v-else class="overflow-x-auto">
                  <table class="w-full text-sm text-left border border-border">
                    <thead class="bg-[#F0F0F0] dark:bg-muted/50" @click.stop>
                      <tr>
                        <th
                          class="px-4 py-3 text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase w-14"
                        >
                          No
                        </th>
                        <th
                          class="px-4 py-3 text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase cursor-pointer hover:text-foreground"
                          @click="handleCarrierSort('name')"
                        >
                          <span class="flex items-center gap-1"
                            >Manage client
                            <SortIcon
                              class="w-4 h-4"
                              :class="carrierSortKey === 'name' ? 'text-primary' : ''"
                          /></span>
                        </th>
                        <th
                          class="px-4 py-3 text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase cursor-pointer hover:text-foreground"
                          @click="handleCarrierSort('usdotNumber')"
                        >
                          <span class="flex items-center gap-1"
                            >User id
                            <SortIcon
                              class="w-4 h-4"
                              :class="carrierSortKey === 'usdotNumber' ? 'text-primary' : ''"
                          /></span>
                        </th>
                        <th
                          class="px-4 py-3 text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase cursor-pointer hover:text-foreground"
                          @click="handleCarrierSort('email')"
                        >
                          <span class="flex items-center gap-1"
                            >Email
                            <SortIcon
                              class="w-4 h-4"
                              :class="carrierSortKey === 'email' ? 'text-primary' : ''"
                          /></span>
                        </th>
                        <th
                          class="px-4 py-3 text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase cursor-pointer hover:text-foreground"
                          @click="handleCarrierSort('phoneNumber')"
                        >
                          <span class="flex items-center gap-1"
                            >Phone number
                            <SortIcon
                              class="w-4 h-4"
                              :class="carrierSortKey === 'phoneNumber' ? 'text-primary' : ''"
                          /></span>
                        </th>
                        <th
                          class="px-4 py-3 text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase cursor-pointer hover:text-foreground"
                          @click="handleCarrierSort('shortName')"
                        >
                          <span class="flex items-center gap-1"
                            >Total comps
                            <SortIcon
                              class="w-4 h-4"
                              :class="carrierSortKey === 'shortName' ? 'text-primary' : ''"
                          /></span>
                        </th>
                        <th
                          class="px-4 py-3 text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase cursor-pointer hover:text-foreground"
                          @click="handleCarrierSort('displayName')"
                        >
                          <span class="flex items-center gap-1"
                            >Trucks
                            <SortIcon
                              class="w-4 h-4"
                              :class="carrierSortKey === 'displayName' ? 'text-primary' : ''"
                          /></span>
                        </th>
                        <th
                          class="px-4 py-3 text-xs font-semibold text-[#666666] dark:text-muted-foreground uppercase"
                        >
                          Work
                        </th>
                      </tr>
                    </thead>

                    <tbody class="divide-y divide-border">
                      <tr
                        v-for="(carrier, carrierIndex) in sortedCarriers(provider.carriers)"
                        :key="carrier.carrierId"
                        class="hover:bg-accent/50 cursor-pointer transition-colors"
                        @click="handleCarrierClick(carrier)"
                      >
                        <td class="px-4 py-3 font-medium text-foreground">
                          {{ carrierIndex + 1 }}
                        </td>
                        <td class="px-4 py-3 text-foreground">{{ carrier.name }}</td>
                        <td class="px-4 py-3 text-muted-foreground">{{ carrier.usdotNumber }}</td>
                        <td class="px-4 py-3 text-muted-foreground">{{ carrier.email }}</td>
                        <td class="px-4 py-3 text-muted-foreground">{{ carrier.phoneNumber }}</td>
                        <td class="px-4 py-3 text-muted-foreground">
                          {{ carrier.timeZoneInfo.shortName }}
                        </td>
                        <td class="px-4 py-3 text-foreground">
                          {{ carrier.timeZoneInfo.displayName }}
                        </td>
                        <td class="px-4 py-3">
                          <Badge
                            class="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400"
                          >
                            Active
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </AccordionContent>
          </div>
        </AccordionTrigger>
      </AccordionItem>
    </Accordion>

    <!-- No results -->
    <div
      v-if="providers.length === 0"
      class="text-center py-12 text-muted-foreground border-b border-border"
    >
      <div class="flex flex-col items-center">
        <div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <PackageOpen class="w-8 h-8 text-muted-foreground" />
        </div>
        <p class="text-sm font-medium text-foreground mb-1">No companies found</p>
        <p class="text-sm text-muted-foreground">Try adjusting your search filters.</p>
      </div>
    </div>
  </div>
</template>
