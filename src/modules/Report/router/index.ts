import type { RouteRecordRaw } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  { path: '/report/tasks', name: 'ReportTasks', component: () => import('@/modules/Report/pages/PReportTasks.vue') },
  { path: '/report/activity', name: 'ReportActivity', component: () => import('@/modules/Report/pages/PReportActivity.vue') },
  { path: '/report/checker', name: 'ReportChecker', component: () => import('@/modules/Report/pages/PReportChecker.vue') },
  { path: '/report/assistant', name: 'ReportAssistant', component: () => import('@/modules/Report/pages/PReportAssistant.vue') },
]

export default routes

