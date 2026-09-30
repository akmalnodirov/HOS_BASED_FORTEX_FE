<template>
  <div class="grid grid-cols-12 gap-3">
    <!-- Signature -->
    <div class="col-span-3 rounded-lg border border-border bg-card p-4 flex flex-col">
      <h2 class="text-sm font-semibold">Signature</h2>
      <div class="flex-1 mt-3 flex items-center justify-center min-h-[100px]">
        <img
          v-if="driverDailyForm?.signaturePath"
          class="object-contain h-full w-full rounded-lg select-none pointer-events-none dark:invert-[0.84]"
          :src="baseUrl + '/' + driverDailyForm.signaturePath"
          alt="signature"
        />
        <p v-else class="font-semibold tracking-wide text-muted-foreground">NO SIGNATURE PATH</p>
      </div>
    </div>

    <!-- Profile Form -->
    <div class="col-span-9 rounded-lg border border-border bg-card p-4">
      <div class="flex justify-between items-start">
        <h2 class="text-sm font-semibold">Profile Form</h2>
        <Button variant="outline" size="sm" @click="emit('edit')">
          <Pencil class="w-3 h-3 mr-1" /> Edit
        </Button>
      </div>
      <div class="mt-4 grid grid-cols-2 border border-border rounded-lg overflow-hidden">
        <ProfileItem label="Driver" :value="driverName" />
        <ProfileItem label="Vehicles" :value="vehiclesText" />
        <ProfileItem label="Carrier" :value="driverDailyForm?.carrier?.name" />
        <ProfileItem label="Co-Drivers" :value="coDriverName" />
        <ProfileItem label="DOT Number" :value="driverDailyForm?.carrier?.usdotNumber" />
        <ProfileItem label="Trailers" :value="trailersText" />
        <ProfileItem label="Home Terminal" :value="driverDailyForm?.driver?.homeTerminal?.street" />
        <ProfileItem label="Shipping Docs" :value="shippingDocsText" />
        <ProfileItem label="Distance" value="N/A" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h } from 'vue'
import { Pencil } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import type { DriverDailyFormResponse } from '@/modules/ELD/LogsModule/[Id]/types/driverDailyForm'

// Inline sub-component for profile items
const ProfileItem = (props: { label: string; value?: string | null }) => {
  return h(
    'div',
    {
      class:
        'py-2.5 px-4 space-y-1 border-r border-b border-border even:border-r-0 last:border-b-0',
    },
    [
      h('p', { class: 'text-xs uppercase text-muted-foreground tracking-wide font-medium' }, props.label),
      h('p', { class: 'text-sm uppercase font-semibold tracking-wide' }, props.value || 'N/A'),
    ],
  )
}

interface Props {
  driverDailyForm: DriverDailyFormResponse | null
}

const props = defineProps<Props>()
const emit = defineEmits<{ edit: [] }>()

const baseUrl = import.meta.env.VITE_APP_BASE_URL || ''

const driverName = computed(() => {
  const d = props.driverDailyForm?.driver?.user
  return d ? `${d.firstName} ${d.lastName}` : 'N/A'
})

const coDriverName = computed(() => {
  const c = props.driverDailyForm?.coDriver?.user
  return c ? `${c.firstName} ${c.lastName}` : 'N/A'
})

const vehiclesText = computed(() =>
  props.driverDailyForm?.assignedVehicles?.map((v) => v.unit).join(', ') || 'N/A',
)

const trailersText = computed(() =>
  props.driverDailyForm?.trailers?.join(', ') || 'N/A',
)

const shippingDocsText = computed(() =>
  props.driverDailyForm?.shippingDocuments?.join(', ') || 'N/A',
)
</script>
