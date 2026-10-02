/**
 * Overview of All Drivers' Last Tracking Positions
 *
 * Provides fleet-wide location overview:
 * - Display last known positions for all drivers in the fleet
 * - Real-time tracking data aggregation
 * - Search functionality to filter drivers
 * - Map visualization of all driver locations
 * - Quick access to individual driver tracking details
 */

// importing stores
import { useTrackingStore } from '@/modules/Overview/store/tracking.ts'
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { getCompanyId } from '@/utils/company.ts'

export function useOverviewList() {
  // search settings
  const search = ref('')

  // declaring stores
  const trackingsStore = useTrackingStore()

  // destructuring stores
  const { lastTrackings } = storeToRefs(trackingsStore)

  // debounce timer
  let debounceTimer: NodeJS.Timeout | null = null

  // function to fetch trackings with search
  const fetchTrackings = async () => {
    await trackingsStore.getDriverLastTrackings(getCompanyId() as string, search.value)
  }

  onMounted(async () => {
    await fetchTrackings()
  })

  // watch search with manual debounce
  watch(search, () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(async () => {
      await fetchTrackings()
    }, 500)
  })

  return {
    // header search
    search,

    // trackings
    lastTrackings,
  }
}
