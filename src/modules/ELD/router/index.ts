import { RouteRecordRaw } from 'vue-router'
import ELDLogsRoutes from '@/modules/ELD/LogsModule/[Id]/router'
import ELDEventSessionsRoutes from '@/modules/ELD/EventSessions/router'

const routes: Readonly<RouteRecordRaw[]> = [
  ...ELDLogsRoutes,
  ...ELDEventSessionsRoutes,
]

export default routes
