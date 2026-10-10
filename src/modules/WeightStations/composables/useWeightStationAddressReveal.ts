import { ref } from 'vue'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'

interface ReverseGeocodeResult {
  label?: string | null
}

const resolvedAddresses = new Map<string, string>()
const requests = new Map<string, Promise<string | null>>()

function coordinateKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`
}

export function useWeightStationAddressReveal() {
  const api = useApi()
  const resolved = ref<Record<string, string>>({})
  const loading = ref<Record<string, boolean>>({})

  function address(latitude: number, longitude: number): string | null {
    const key = coordinateKey(latitude, longitude)
    return resolved.value[key] ?? resolvedAddresses.get(key) ?? null
  }

  function isLoading(latitude: number, longitude: number) {
    return !!loading.value[coordinateKey(latitude, longitude)]
  }

  async function reveal(latitude: number, longitude: number) {
    const key = coordinateKey(latitude, longitude)
    if (address(latitude, longitude) || loading.value[key]) return

    loading.value[key] = true
    try {
      let request = requests.get(key)
      if (!request) {
        request = api
          .get<ReverseGeocodeResult>(ApiEndpoints.ALPR_GEOCODE_REVERSE, {
            params: { latitude, longitude },
            _skipErrorHandling: true,
          })
          .then((response) => response.data.label?.trim() || null)
          .catch(() => null)
          .finally(() => requests.delete(key))
        requests.set(key, request)
      }

      const result = await request
      if (result) {
        resolvedAddresses.set(key, result)
        resolved.value = { ...resolved.value, [key]: result }
      }
    } finally {
      loading.value = { ...loading.value, [key]: false }
    }
  }

  return { address, isLoading, reveal }
}
