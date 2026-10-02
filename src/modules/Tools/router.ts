import { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/tools/activity',
    name: 'ToolsActivity',
    component: () => import('@/modules/Tools/Activity/pages/PActivity.vue'),
    meta: {
      layout: 'default',
    },
  },
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
    path: '/tools/deletion-menu',
    name: 'ToolsDeletionMenu',
    component: () => import('@/modules/Tools/DeletionMenu/pages/PDelMenu.vue'),
    meta: {
      layout: 'default',
    },
  },
  {
    path: '/tools/audit',
    name: 'ToolsAudit',
    component: () => import('@/modules/Tools/Audit/pages/PAudit.vue'),
    meta: {
      layout: 'default',
    },
  },
  {
    path: '/tools/audit/:driverId/:auditId',
    name: 'ToolsAuditDetail',
    component: () => import('@/modules/Tools/Audit/pages/PAuditDetail.vue'),
    meta: {
      layout: 'default',
    },
  },
  {
    path: '/tools/users',
    name: 'ToolsUsers',
    component: () => import('@/modules/Tools/Users/pages/PUsers.vue'),
    meta: {
      layout: 'default',
    },
  },
  {
    path: '/tools/elds',
    name: 'ToolsELDs',
    component: () => import('@/modules/Tools/ELDs/pages/PELDs.vue'),
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
