<template>
  <KeepAlive>
    <RouteEldInitialLayout v-if="route.name === 'ELDLogDetail' || route.name === 'ELDTracking'" />
    <LegacyLogsLayout v-else />
  </KeepAlive>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import LegacyLogsLayout from './LegacyLogsLayout.vue'
import RouteEldInitialLayout from './RouteEldInitialLayout.vue'

const route = useRoute()
</script>
