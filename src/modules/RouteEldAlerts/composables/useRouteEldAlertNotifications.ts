import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
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

export function useRouteEldAlertNotifications() {
  const router = useRouter()
  const api = useApi()
  const authStore = useAuthStore()
  const { latestWeighStationAlert, latestGenericAlert } = useRouteEldAlertSocket()

  async function viewAlerts(companyId: string | null, type: 'station' | 'alpr' | 'speed' | 'violation', alertId?: string) {
    if (!companyId || !hasPermission(authStore.token, `route_eld.alerts.${type}`)) return
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
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Could not open alerts')
    }
  }

  watch(latestWeighStationAlert, (alert) => {
    if (!alert) return
    if (!hasPermission(authStore.token, 'route_eld.alerts.station')) return

    const details = [
      alert.location,
      alert.direction,
      `${alert.distanceMiles.toFixed(2)} mi away`,
      `Driver: ${alert.driverLocation || coordinates(alert.driverLatitude, alert.driverLongitude)}`,
      `Company: ${localStorage.getItem('companyName')}`
    ]
      .filter(Boolean)
      .join(' · ')

    toast.warning(`${alert.driverName} is approaching ${alert.stationName}`, {
      id: `route-eld-station-${alert.alertId}`,
      description: details,
      duration: 10_000,
      position: 'top-right',
      action: {
        label: 'View alerts',
        onClick: () => void viewAlerts(alert.companyId, 'station', alert.alertId),
      },
    })
  })

  watch(latestGenericAlert, (alert) => {
    if (!alert || (alert.notificationKey !== 'speed' && alert.notificationKey !== 'violation')) return
    if (!hasPermission(authStore.token, `route_eld.alerts.${alert.notificationKey}`)) return
    toast.warning(alert.message, {
      id: `route-eld-${alert.notificationKey}-${alert.companyId}-${alert.message}`,
      duration: 10_000,
      position: 'top-right',
      action: {
        label: 'View alerts',
        onClick: () => void viewAlerts(alert.companyId, alert.notificationKey as 'speed' | 'violation'),
      },
    })
  })
}

