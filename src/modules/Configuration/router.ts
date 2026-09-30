import { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/config/issuer-states',
    name: 'ConfigIssuerStates',
    component: () => import('@/modules/Configuration/IssuerStates/pages/PIssuerStates.vue'),
    meta: {
      layout: 'default',
    },
  },
  {
    path: '/config/hos-rules',
    name: 'ConfigHOSRules',
    component: () => import('@/modules/Configuration/HOSRules/pages/PHOSRules.vue'),
    meta: {
      layout: 'default',
    },
  },
  {
    path: '/config/restarts',
    name: 'ConfigRestarts',
    component: () => import('@/modules/Configuration/Restarts/pages/PRestarts.vue'),
    meta: {
      layout: 'default',
    },
  },
  {
    path: '/config/rest-breaks',
    name: 'ConfigRestBreaks',
    component: () => import('@/modules/Configuration/RestBreaks/pages/PRestBreaks.vue'),
    meta: {
      layout: 'default',
    },
  },
  {
    path: '/config/cargo-types',
    name: 'ConfigCargoTypes',
    component: () => import('@/modules/Configuration/CargoTypes/pages/PCargoTypes.vue'),
    meta: {
      layout: 'default',
    },
  },
  {
    path: '/config/vehicle-fuels',
    name: 'ConfigVehicleFuels',
    component: () => import('@/modules/Configuration/VehicleFuels/pages/PVehicleFuels.vue'),
    meta: {
      layout: 'default',
    },
  },
  {
    path: '/tools/eld-connections',
    name: 'ConfigELDConnections',
    component: () => import('@/modules/Configuration/ELDConnections/pages/PELDConnections.vue'),
    meta: {
      layout: 'default',
    },
  },
  {
    path: '/tools/maintenance-types',
    name: 'ConfigMaintenanceTypes',
    component: () => import('@/modules/Configuration/MaintenanceTypes/pages/PMaintenanceTypes.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes
