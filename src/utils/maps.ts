import { computed } from 'vue'
import { useDarkMode } from '@/composables/useDarkMode'

const lightMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#bdbdbd' }],
  },
  {
    featureType: 'administrative.province',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#dadada' }],
  },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
]

const darkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#202b3b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#aab8cb' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#202b3b' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#48566a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#253348' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1e403a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#36465b' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#52657d' }] },
  { featureType: 'road.highway', elementType: 'labels.text.stroke', stylers: [{ color: '#293647' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#29384b' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#142433' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#819bb2' }] },
]

const { isDarkMode } = useDarkMode()
export const mapStyles = computed(() => isDarkMode.value ? darkMapStyles : lightMapStyles)

export function mapMarkerInfoPadding(map: { getDiv?: () => HTMLElement }) {
  const container = map.getDiv?.()
  const width = container?.clientWidth || 650
  const height = container?.clientHeight || 288
  const horizontal = Math.min(245, Math.floor(width * 0.37))
  return {
    top: Math.min(190, Math.floor(height * 0.65)),
    right: horizontal,
    bottom: 30,
    left: horizontal,
  }
}
