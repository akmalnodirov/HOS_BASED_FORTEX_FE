import { reactive } from 'vue'

// Keep camera badges stable when log tabs and pages are remounted.
export const cameraPresenceCache = reactive(new Map<string, {
  signature: string
  hasCamera: boolean
  routeVerified?: boolean
}>())
