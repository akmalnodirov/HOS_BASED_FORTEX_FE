import { ref } from 'vue'
import { MAP_TYPE_OPTIONS, type MapType } from '@/utils/maps'

const STORAGE_KEY = 'map-type'

function isAvailable(value: unknown): value is MapType {
  return MAP_TYPE_OPTIONS.some((option) => option.id === value)
}

function readStoredMapType(): MapType {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isAvailable(stored) ? stored : 'map'
  } catch {
    return 'map'
  }
}

const mapType = ref<MapType>(readStoredMapType())

export function useMapType() {
  const setMapType = (value: MapType) => {
    if (!isAvailable(value)) return
    mapType.value = value
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      return
    }
  }

  return {
    mapType,
    mapTypeOptions: MAP_TYPE_OPTIONS,
    setMapType,
  }
}
