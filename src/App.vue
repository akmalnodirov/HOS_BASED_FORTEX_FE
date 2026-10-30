<template>
  <RouterView />
  <Toaster />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { Toaster } from '@/components/ui/sonner'
import { useDarkMode } from '@/composables/useDarkMode'
import { useRouteEldAlertNotifications } from '@/modules/RouteEldAlerts/composables/useRouteEldAlertNotifications'
import { useReportSocket } from '@/modules/Report/composables/useReportSocket'
import 'vue-sonner/style.css'
import '@/assets/toast-styles.css'

const { initDarkMode } = useDarkMode()
useRouteEldAlertNotifications()
useReportSocket()

if (typeof window !== 'undefined') initDarkMode()
</script>
