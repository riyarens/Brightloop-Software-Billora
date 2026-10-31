import { api } from './client';

export type ProductType = 'SERVICE' | 'GOODS' | 'DIGITAL';

export interface ProductVariant {
  id: string;
  name: string;
  code?: string | null;
  salesPrice?: number | string;
  isActive?: boolean;
}

export interface Product {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  type: ProductType;
  salesPrice: number | string;
  costPrice: number | string;
  notes?: string | null;
  isActive: boolean;
  variants?: ProductVariant[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductInput {
  name: string;
  code?: string;
  description?: string;
  type?: ProductType;
  salesPrice: number;
  costPrice?: number;
  notes?: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApiResponse<T> {
  message: string;
  data: T;
  meta?: Pagination;
}

export interface ProductListParams {
  search?: string;
  type?: ProductType;
  page?: number;
  limit?: number;
}

export const productApi = {
  // Get all products
  async getAll(params: ProductListParams = {}) {
    const response = await api.get<ApiResponse<Product[]>>(
      '/api/products',
      { params }
    );

    return {
      products: response.data.data,
      pagination: response.data.meta,
    };
  },

  // Get product by ID
  async getById(id: string) {
    const response = await api.get<ApiResponse<Product>>(
      `/api/products/${id}`
    );

    return response.data.data;
  },

  // Create product
  async create(data: ProductInput) {
    const response = await api.post<ApiResponse<Product>>(
      '/api/products',
      data
    );

    return response.data.data;
  },

  // Update product
  async update(id: string, data: Partial<ProductInput>) {
    const response = await api.put<ApiResponse<Product>>(
      `/api/products/${id}`,
      data
    );

    return response.data.data;
  },

  // Delete product
  async delete(id: string) {
    const response = await api.delete(
      `/api/products/${id}`
    );

    return response.data;
  },
};