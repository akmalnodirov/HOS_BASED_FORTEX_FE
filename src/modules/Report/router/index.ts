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
  { path: '/report/teams', name: 'ReportTeams', component: () => import('@/modules/Report/pages/PReportTeams.vue') },
  { path: '/report/statistics', name: 'ReportStatistics', component: () => import('@/modules/Report/pages/PReportAnalytics.vue') },
  { path: '/report/attendance', name: 'ReportAttendance', component: () => import('@/modules/Report/pages/PReportAnalytics.vue') },
  { path: '/report/kpi', name: 'ReportKpi', component: () => import('@/modules/Report/pages/PReportAnalytics.vue') },
  { path: '/report/kpi/employee/:userId', name: 'ReportKpiEmployee', component: () => import('@/modules/Report/pages/PReportMyKpi.vue') },
  { path: '/report/my-kpi', name: 'ReportMyKpi', component: () => import('@/modules/Report/pages/PReportMyKpi.vue') },
  { path: '/report/salary', name: 'ReportSalary', component: () => import('@/modules/Report/pages/PReportCompensation.vue') },
  { path: '/report/bonuses', name: 'ReportBonuses', component: () => import('@/modules/Report/pages/PReportCompensation.vue') },
  { path: '/report/notes', name: 'ReportNotes', component: () => import('@/modules/Report/pages/PReportNotes.vue') },
  { path: '/report/settings', name: 'ReportSettings', component: () => import('@/modules/Report/pages/PReportSettings.vue') },
  { path: '/report/contracts', name: 'ReportContracts', component: () => import('@/modules/Report/pages/PReportContracts.vue') },
  { path: '/report/statement', name: 'ReportStatement', component: () => import('@/modules/Report/pages/PReportStatement.vue') },
  { path: '/report/owner/dashboard', name: 'ReportOwnerDashboard', component: () => import('@/modules/Report/pages/Owner/PReportOwnerDashboard.vue') },
  { path: '/report/owner/inspections', name: 'ReportOwnerInspections', component: () => import('@/modules/Report/pages/Owner/PReportOwnerInspections.vue') },
  { path: '/report/owner/time', name: 'ReportOwnerTime', component: () => import('@/modules/Report/pages/Owner/PReportOwnerTime.vue') },
  { path: '/report/owner/teams', name: 'ReportOwnerTeams', component: () => import('@/modules/Report/pages/Owner/PReportOwnerTeams.vue') },
  { path: '/report/owner/salary', name: 'ReportOwnerSalary', component: () => import('@/modules/Report/pages/Owner/PReportOwnerSalary.vue') },
  { path: '/report/owner/expenses', name: 'ReportOwnerExpenses', component: () => import('@/modules/Report/pages/Owner/PReportOwnerExpenses.vue') },
  { path: '/report/owner/settings', name: 'ReportOwnerSettings', component: () => import('@/modules/Report/pages/Owner/PReportOwnerSettings.vue') },
]

export default routes

