import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useRouteEldAlertSocket } from './useRouteEldAlertSocket'

function coordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
}

export function useRouteEldAlertNotifications() {
  const router = useRouter()
  const { latestWeighStationAlert, latestAlprCameraAlert } = useRouteEldAlertSocket()

  watch(latestWeighStationAlert, (alert) => {
    if (!alert) return

    const details = [
      alert.location,
      alert.direction,
      `${alert.distanceMiles.toFixed(2)} mi away`,
      `Driver: ${alert.driverLocation || coordinates(alert.driverLatitude, alert.driverLongitude)}`,
    ]
      .filter(Boolean)
      .join(' · ')

    toast.warning(`${alert.driverName} is approaching ${alert.stationName}`, {
      id: `route-eld-station-${alert.alertId}`,
      description: details,
      duration: 15_000,
      action: {
        label: 'View alerts',
        onClick: () =>
          router.push({
            name: 'RouteEldAlerts',
            query: { type: 'station', alert: alert.alertId },
          }),
      },
    })
  })

  watch(latestAlprCameraAlert, (alert) => {
    if (!alert) return

    const cameraDetails = [alert.brand, alert.operator].filter(Boolean).join(' · ')
    const details = [
      cameraDetails || coordinates(alert.latitude, alert.longitude),
      `${alert.distanceMiles.toFixed(2)} mi away`,
      `Driver: ${alert.driverLocation || coordinates(alert.driverLatitude, alert.driverLongitude)}`,
    ].join(' · ')

    toast.warning(`${alert.driverName} is approaching ALPR camera ${alert.cameraName}`, {
      id: `route-eld-alpr-${alert.alertId}`,
      description: details,
      duration: 15_000,
      action: {
        label: 'View alerts',
        onClick: () =>
          router.push({
            name: 'RouteEldAlerts',
            query: { type: 'alpr', alert: alert.alertId },
          }),
      },
    })
  })
}
