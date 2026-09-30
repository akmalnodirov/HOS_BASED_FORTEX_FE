// src/types/statistics.ts
export interface StatisticsAdmin {
  name: string
  avatar: string
  percentage: string
  startDate: string
  endDate: string
  editDate: number
  mistakeFixed: number
  violationFixed: number
}

export interface KpiData {
  categories: string[]
  series: {
    name: string
    data: number[]
  }[]
}

export interface TasksData {
  categories: string[]
  series: {
    name: string
    data: number[]
  }[]
}

export interface DonutData {
  labels: string[]
  series: number[]
}

export interface TableRecord {
  id: string
  no: number
  company: string
  driver: string
  ufUsedTool: string
  mistakesBefore: number
  mistakesAfter: number
  violationBefore: number
  violationAfter: number
}

export interface StatisticsCard {
  label: string
  value: string
  total?: string
}
