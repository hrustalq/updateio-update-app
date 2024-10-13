export interface PaginatedResponse<T> {
  data: T[]
  limit: number
  page: number
  totalCount: number
  totalPages: number
}

export interface PaginationParams {
  page: number
  perPage: number
}
