import { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/tools/monitoring',
    name: 'ToolsMonitoring',
    component: () => import('@/modules/Tools/Monitoring/pages/PMonitoring.vue'),
    meta: {
      layout: 'default',
    },
  },
  {
    path: '/tools/monitoring/:companyId',
    name: 'ToolsMonitoringDetail',
    component: () => import('@/modules/Tools/Monitoring/pages/PMonitoringDetail.vue'),
    meta: {
      layout: 'default',
    },
  },
  {
    path: '/tools/dot-inspection',
    name: 'ToolsDotInspection',
    component: () => import('@/modules/Tools/DotInspection/pages/PDotIns.vue'),
    meta: {
      layout: 'default',
    },
  },
  {
    path: '/tools/statistic-admin',
    name: 'ToolsStatisticAdmin',
    component: () => import('@/modules/Tools/StatisticAdmin/pages/PStatisticAdmin.vue'),
    meta: {
      layout: 'default',
    },
  },
  {
    path: '/tools/statistic-company',
    name: 'ToolsStatisticCompany',
    component: () => import('@/modules/Tools/StatisticCompany/pages/PStatisticCompany.vue'),
    meta: {
      layout: 'default',
    },
  },
]

export default routes
