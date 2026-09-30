import { useRoute } from 'vue-router'

export interface PaginationRequest {
  pageNumber: number | null
  pageSize: number | null
}

/**
 * Get pagination params from route query
 * @param getPartial - If true, return pagination params from route query. If false, return null values
 * @param defaultPageSize - Default page size if not specified in route query
 * @returns PaginationRequest object with pageNumber and pageSize
 */
export const pagination = (getPartial: boolean | undefined = true, defaultPageSize: number = 10): PaginationRequest => {
  if (!getPartial) return { pageNumber: null, pageSize: null }

  const route = useRoute()

  return {
    pageNumber: parseInt(route.query.pageNumber as string) || 1,
    pageSize: parseInt(route.query.pageSize as string) || defaultPageSize,
  }
}
