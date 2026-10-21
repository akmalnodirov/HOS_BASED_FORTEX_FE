import { defineComponent, h, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Camera, Check, Eye, Gauge, Scale, ShieldAlert } from 'lucide-vue-next'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { hasPermission } from '@/router/permissions'
import type { RouteEldCompaniesResponse } from '@/types/company'
import { setCompanyId, setCompanyTimeZoneId } from '@/utils/company'
import { useRouteEldAlertSocket } from './useRouteEldAlertSocket'
import { useRouteEldNotificationCenter } from './useRouteEldNotificationCenter'

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

export function useRouteEldAlertNavigation() {
  const router = useRouter()
  const api = useApi()
  const authStore = useAuthStore()
  async function viewAlerts(companyId: string | null, type: 'station' | 'alpr' | 'speed' | 'violation', alertId?: string) {
    if (!companyId || !hasPermission(authStore.token, `route_eld.alerts.${type}`)) return false
    try {
      const response = await api.get<RouteEldCompaniesResponse>(ApiEndpoints.ROUTE_ELD_COMPANIES)
      const company = response.data.successResult.find((item) =>
        item.id.toLowerCase() === companyId.toLowerCase() ||
        item.externalCompanyId.toLowerCase() === companyId.toLowerCase()
      )
      if (!company) throw new Error('You do not have access to the alert company.')
      if (authStore.companyId?.toLowerCase() !== company.id.toLowerCase()) {
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

  return { viewAlerts }
}

export function useRouteEldAlertNotifications() {
  const { viewAlerts } = useRouteEldAlertNavigation()
  const { enabledTypes, markRead, refresh } = useRouteEldNotificationCenter()
  const authStore = useAuthStore()
  const { latestWeighStationAlert, latestAlprCameraAlert, latestGenericAlert } = useRouteEldAlertSocket()
  let refreshTimer: ReturnType<typeof setTimeout> | null = null

  async function readAlert(alert: RouteEldAlertToast, toastId: string) {
    if (!alert.alertId) return
    try {
      await markRead({ id: alert.alertId, type: alert.type })
      toast.dismiss(toastId)
    } catch {
      toast.error('Could not mark alert as read')
    }
  }

  function showAlert(alert: RouteEldAlertToast, id: string) {
    if (!enabledTypes.value.includes(alert.type)) return
    const icons = { station: Scale, alpr: Camera, speed: Gauge, violation: ShieldAlert }
    const iconButton = 'inline-flex h-8 w-8 items-center justify-center rounded border border-border bg-background text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary'
    const content = defineComponent({
      setup: () => () => h('div', { class: 'flex w-full items-start gap-3' }, [
        h(icons[alert.type], { class: 'mt-0.5 h-5 w-5 shrink-0 text-amber-500' }),
        h('div', { class: 'min-w-0 flex-1' }, [
          h('div', { class: 'text-sm font-semibold text-foreground' }, alert.title),
          h('div', { class: 'mt-1 text-xs text-muted-foreground' }, alert.description),
        ]),
        h('div', { class: 'flex shrink-0 gap-1' }, [
          h('button', { type: 'button', class: iconButton, title: 'View alerts', 'aria-label': 'View alerts', onClick: () => { toast.dismiss(id); void viewAlerts(alert.companyId, alert.type, alert.alertId) } }, [h(Eye, { class: 'h-4 w-4' })]),
          h('button', { type: 'button', class: iconButton, title: 'Mark as read', 'aria-label': 'Mark as read', disabled: !alert.alertId, onClick: () => void readAlert(alert, id) }, [h(Check, { class: 'h-4 w-4' })]),
        ]),
      ]),
    })
    toast.custom(content, {
      id,
      duration: 1_500,
      position: 'top-right',
      class: 'route-eld-alert-toast',
    })
    if (refreshTimer) clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => { refreshTimer = null; void refresh() }, 400)
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
      description: plainMessage(alert.message), companyId: alert.companyId, alertId: alert.alertId || undefined },
    `route-eld-${alert.notificationKey}-${alert.companyId}-${alert.message}`)
  })
}

