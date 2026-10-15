<template>
  <KeepAlive>
    <RouteEldInitialLayout v-if="usesRouteEldLayout" />
    <LegacyLogsLayout v-else />
  </KeepAlive>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import LegacyLogsLayout from './LegacyLogsLayout.vue'
import RouteEldInitialLayout from './RouteEldInitialLayout.vue'

const route = useRoute()
const usesRouteEldLayout = computed(() =>
  ['ELDLogDetail', 'ELDBoost', 'ELDTracking'].includes(String(route.name))
)
</script>
