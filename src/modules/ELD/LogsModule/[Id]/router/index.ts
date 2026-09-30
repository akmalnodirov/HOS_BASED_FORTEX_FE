import { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/eld/logs',
    name: 'ELDLogs',
    component: () => import('@/modules/ELD/LogsModule/[Id]/pages/PELDLogs.vue'),
    meta: {
      layout: 'default',
    },
  },
  {
    path: '/logs/:id',
    component: () => import('@/modules/ELD/LogsModule/Layouts/LogsLayout.vue'),
    meta: {
      layout: 'default',
    },
    children: [
      {
        path: '',
        name: 'ELDLogDetail',
        component: () => import('@/modules/ELD/LogsModule/[Id]/pages/PELDLogDetail.vue'),
      },
      {
        path: 'boost',
        name: 'ELDBoost',
        component: () => import('@/modules/ELD/LogsModule/Boost/pages/PBoost.vue'),
      },
      {
        path: 'optimise',
        name: 'ELDOptimise',
        component: () => import('@/modules/ELD/LogsModule/Optimize/pages/POptimise.vue'),
      },
      {
        path: 'tracking',
        name: 'ELDTracking',
        component: () => import('@/modules/ELD/LogsModule/Tracking/pages/PTracking.vue'),
      },
      {
        path: 'insert-info',
        name: 'ELDInsertInfoLog',
        component: () =>
          import('@/modules/ELD/LogsModule/InsertInfoLog/pages/PELDInsertInfoLog.vue'),
      },
    ],
  },
]

export default routes
