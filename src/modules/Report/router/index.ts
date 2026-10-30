import type { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  { path: '/report/tasks', name: 'ReportTasks', component: () => import('@/modules/Report/pages/PReportTasks.vue') },
  { path: '/report/activity', name: 'ReportActivity', component: () => import('@/modules/Report/pages/PReportActivity.vue') },
  { path: '/report/checker', name: 'ReportChecker', component: () => import('@/modules/Report/pages/PReportChecker.vue') },
  { path: '/report/assistant', name: 'ReportAssistant', component: () => import('@/modules/Report/pages/PReportAssistant.vue') },
  { path: '/report/inspection/violation', name: 'ReportViolation', component: () => import('@/modules/Report/pages/PReportInspections.vue') },
  { path: '/report/inspection/no-violation', name: 'ReportNoViolation', component: () => import('@/modules/Report/pages/PReportInspections.vue') },
  { path: '/report/manage/drivers', name: 'ReportDrivers', component: () => import('@/modules/Report/pages/PReportDrivers.vue') },
  { path: '/report/manage/companies', name: 'ReportCompanies', component: () => import('@/modules/Report/pages/PReportCatalog.vue') },
  { path: '/report/levels', name: 'ReportLevels', component: () => import('@/modules/Report/pages/PReportCatalog.vue') },
]

export default routes

