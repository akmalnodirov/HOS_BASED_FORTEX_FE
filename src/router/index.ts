import { createWebHistory, createRouter } from 'vue-router'
import AuthRoutes from '@/modules/Auth/router'
import AlertRoutes from '@/modules/Alerts/router'
import OverviewRoutes from '@/modules/Overview/router'
import ELDRoutes from '@/modules/ELD/router'
import VehicleRoutes from '@/modules/Vehicles/router'
import DriverRoutes from '@/modules/Drivers/router'
import IftaRoutes from '@/modules/Ifta/router'
import DvirRoutes from '@/modules/Dvir/router'
import CompanyRoutes from '@/modules/Company/router'
import PortalUserRoutes from '@/modules/PortalUsers/router'
import ToolsRoutes from '@/modules/Tools/router'
import ConfigurationRoutes from '@/modules/Configuration/router'
import UserManagerRoutes from '@/modules/UserManager/router'
import TruckStopsRoutes from '@/modules/TruckStops/router'
import GeofenceRoutes from '@/modules/Geofence/router'
import ChatRoutes from '@/modules/Chat/router'
import ProfileRoutes from '@/modules/Profile/router'
import { authMiddleware } from './middleware'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '',
      component: () => import('@/layouts/Default/PIndex.vue'),
      children: [
        ...AlertRoutes,
        ...OverviewRoutes,
        ...ELDRoutes,
        ...VehicleRoutes,
        ...DriverRoutes,
        ...IftaRoutes,
        ...DvirRoutes,
        ...CompanyRoutes,
        ...PortalUserRoutes,
        ...ToolsRoutes,
        ...ConfigurationRoutes,
        ...UserManagerRoutes,
        ...TruckStopsRoutes,
        ...GeofenceRoutes,
        ...ChatRoutes,
        ...ProfileRoutes,
      ],
    },
    {
      path: '/initial',
      name: 'Initial',
      component: () => import('@/layouts/Initial/PIndex.vue'),
      redirect: '/initial/companies',
      children: [
        {
          path: 'companies',
          name: 'Companies',
          component: () => import('@/layouts/Initial/pages/PCompanies.vue'),
        },
        {
          path: 'clients',
          name: 'Clients',
          component: () => import('@/layouts/Initial/pages/PClients.vue'),
        },
      ],
    },
    ...AuthRoutes,
    // {
    //   path: '/:pathMatch(.*)*',
    //   name: 'NotFound',
    //   component: () => import('@/pages/PError.vue'),
    // },
  ],
})

// Apply authentication middleware
router.beforeEach(authMiddleware)

export default router
