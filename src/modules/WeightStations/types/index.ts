export interface WeightStation {
  id: string
  name: string | null
  stateCode: string | null
  location: string | null
  direction: string | null
  marker: string | null
  type: string | null
  latitude: number
  longitude: number
}

export interface WeightStationCluster {
  clusterId: string
  latitude: number
  longitude: number
  count: number
  stationId: string | null
  name: string | null
  stateCode: string | null
  location: string | null
  direction: string | null
  marker: string | null
  type: string | null
}

export interface PaginationMetadata {
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface WeightStationPage {
  data: WeightStation[]
  pagination: PaginationMetadata
}

export interface WeightStationFilters {
  search: string
  stateCode: string
  marker: string
  pageNumber: number
  pageSize: number
}

export interface WeightStationClusterFilters {
  search: string
  stateCode: string
  marker: string
  west: number
  south: number
  east: number
  north: number
  zoom: number
}
