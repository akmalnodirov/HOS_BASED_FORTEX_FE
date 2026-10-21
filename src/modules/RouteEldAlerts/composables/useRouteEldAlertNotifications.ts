import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Camera, Gauge, Scale, ShieldAlert } from 'lucide-vue-next'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { hasPermission } from '@/router/permissions'
import type { RouteEldCompaniesResponse } from '@/types/company'
import { setCompanyId, setCompanyTimeZoneId } from '@/utils/company'
import { useRouteEldAlertSocket } from './useRouteEldAlertSocket'

function coordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
}

interface RouteEldAlertToast {
  type: 'station' | 'alpr' | 'speed' | 'violation'
  title: string
  description: string
  companyId: string
  alertId?: string
}

function plainMessage(message: string) {
  return new DOMParser().parseFromString(message, 'text/html').body.textContent
    ?.replace(/^[\s\p{Extended_Pictographic}\uFE0F]+/u, '').trim() || message
}

export function useRouteEldAlertNotifications() {
  const router = useRouter()
  const api = useApi()
  const authStore = useAuthStore()
  const { latestWeighStationAlert, latestAlprCameraAlert, latestGenericAlert } = useRouteEldAlertSocket()

  async function viewAlerts(companyId: string | null, type: 'station' | 'alpr' | 'speed' | 'violation', alertId?: string) {
    if (!companyId || !hasPermission(authStore.token, `route_eld.alerts.${type}`)) return false
    try {
      if (authStore.companyId?.toLowerCase() !== companyId.toLowerCase()) {
        const response = await api.get<RouteEldCompaniesResponse>(ApiEndpoints.ROUTE_ELD_COMPANIES)
        const company = response.data.successResult.find((item) =>
          item.id.toLowerCase() === companyId.toLowerCase()
        )
        if (!company) throw new Error('You do not have access to the alert company.')

        await api.post(ApiEndpoints.ROUTE_ELD_SELECT_COMPANY(company.id))
        setCompanyId(company.id)
        setCompanyTimeZoneId('UTC')
        localStorage.setItem('companyName', company.name)
        await authStore.fetchCurrentUser()
        if (authStore.companyId?.toLowerCase() !== company.id.toLowerCase())
          throw new Error('The alert company could not be selected.')
      }
      await router.push({ name: 'RouteEldAlerts', query: { type, ...(alertId ? { alert: alertId } : {}) } })
      return true
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Could not open alerts')
      return false
    }
  }

  function showAlert(alert: RouteEldAlertToast, id: string) {
    const icons = { station: Scale, alpr: Camera, speed: Gauge, violation: ShieldAlert }
    toast.warning(alert.title, {
      id,
      description: alert.description,
      icon: icons[alert.type],
      duration: 5_000,
      position: 'top-right',
      class: 'route-eld-alert-toast',
      action: {
        label: 'View alerts',
        onClick: () => void viewAlerts(alert.companyId, alert.type, alert.alertId),
      },
    })
  }

  watch(latestWeighStationAlert, (alert) => {
    if (!alert) return
    if (!hasPermission(authStore.token, 'route_eld.alerts.station')) return

    const details = [
      alert.location,
      alert.direction,
      `${alert.distanceMiles.toFixed(2)} mi away`,
      `Driver: ${alert.driverLocation || coordinates(alert.driverLatitude, alert.driverLongitude)}`
    ]
      .filter(Boolean)
      .join(' · ')

    if (alert.companyId) showAlert({ type: 'station', title: `${alert.driverName} is approaching ${alert.stationName}`,
      description: details, companyId: alert.companyId, alertId: alert.alertId }, `route-eld-station-${alert.alertId}`)
  })

  watch(latestAlprCameraAlert, (alert) => {
    if (!alert) return
    if (!hasPermission(authStore.token, 'route_eld.alerts.alpr')) return

    const details = [
      [alert.brand, alert.operator].filter(Boolean).join(' · ') ||
      coordinates(alert.latitude, alert.longitude),
      `${alert.distanceMiles.toFixed(2)} mi away`,
      `Driver: ${alert.driverLocation || coordinates(alert.driverLatitude, alert.driverLongitude)}`
    ].join(' · ')

    if (alert.companyId) showAlert({ type: 'alpr', title: `${alert.driverName} is approaching an ALPR camera`,
      description: details, companyId: alert.companyId, alertId: alert.alertId }, `route-eld-alpr-${alert.alertId}`)
  })

  watch(latestGenericAlert, (alert) => {
    if (!alert || (alert.notificationKey !== 'speed' && alert.notificationKey !== 'violation')) return
    if (!hasPermission(authStore.token, `route_eld.alerts.${alert.notificationKey}`)) return
    showAlert({ type: alert.notificationKey, title: alert.notificationKey === 'speed' ? 'Speed alert' : 'Violation alert',
      description: plainMessage(alert.message), companyId: alert.companyId },
    `route-eld-${alert.notificationKey}-${alert.companyId}-${alert.message}`)
  })
}

