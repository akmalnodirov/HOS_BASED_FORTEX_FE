export type KpiData = Record<string, unknown>

export type TasksData = Record<string, unknown>

export type DonutData = Record<string, unknown>

export type TableRecord = Record<string, unknown>

export type StatisticsCard = Record<string, unknown>

export type StatisticsAdmin = {
  kpis?: KpiData[]
  tasks?: TasksData[]
  donut?: DonutData[]
  table?: TableRecord[]
  cards?: StatisticsCard[]
} | Record<string, unknown>
