import { RouteRecordRaw } from 'vue-router'
import ELDLogsRoutes from '@/modules/ELD/LogsModule/[Id]/router'
import ELDUnidentifiedRoutes from '@/modules/ELD/Unidentified/router'

const routes: Readonly<RouteRecordRaw[]> = [
  ...ELDLogsRoutes,
  ...ELDUnidentifiedRoutes,
]

export default routes
