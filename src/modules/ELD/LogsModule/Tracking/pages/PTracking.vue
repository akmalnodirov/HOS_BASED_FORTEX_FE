<template>
  <div v-if="isGraphLoading" class="flex h-full items-center justify-center bg-white dark:bg-background">
    <LoaderCircle class="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
  <div
    v-else-if="error"
    class="m-4 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
  >
    {{ error }}
  </div>
  <CLogRouteEldTracking
    v-else
    fill-available
    :points="detail?.trackingPoints ?? []"
    :current-status="detail?.hos?.currentStatus"
    :time-zone="detail?.timeZone"
  />
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { LoaderCircle } from 'lucide-vue-next'
import CLogRouteEldTracking from '@/modules/ELD/LogsModule/[Id]/components/detail/CLogRouteEldTracking.vue'
import type { useRouteEldLogDetail } from '@/modules/ELD/LogsModule/[Id]/composables/useRouteEldLogDetail'

const logDetail = inject('logDetail') as ReturnType<typeof useRouteEldLogDetail>
const { detail, error, isGraphLoading } = logDetail
</script>
