export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: Pagination;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PageResult<T> {
  items: T[];
  pagination?: Pagination;
}
