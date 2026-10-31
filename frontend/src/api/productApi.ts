import { api } from './client';
import type { ApiResponse } from './types';

export type ProductType = 'SERVICE' | 'GOODS' | 'DIGITAL';

export interface ProductVariant {
  id: string;
  productId: string;
  brand: string;
  name?: string | null;
  extraPrice: number | string;
  sku?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
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

export interface ProductListParams {
  search?: string;
  type?: ProductType;
  page?: number;
  limit?: number;
}

export interface VariantInput {
  brand: string;
  name?: string;
  extraPrice?: number;
  sku?: string;
}

export const productApi = {
  // Get all products
  async getAll(params: ProductListParams = {}) {
    const response = await api.get<ApiResponse<Product[]>>(
      '/products',
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
      `/products/${id}`
    );

    return response.data.data;
  },

  // Create product
  async create(data: ProductInput) {
    const response = await api.post<ApiResponse<Product>>(
      '/products',
      data
    );

    return response.data.data;
  },

  // Update product
  async update(id: string, data: Partial<ProductInput>) {
    const response = await api.put<ApiResponse<Product>>(
      `/products/${id}`,
      data
    );

    return response.data.data;
  },

  // Delete product
  async delete(id: string) {
    const response = await api.delete(
      `/products/${id}`
    );

    return response.data;
  },

  async getVariants(productId: string) {
    const response = await api.get<ApiResponse<ProductVariant[]>>(
      `/products/${productId}/variants`,
    );
    return response.data.data;
  },

  async createVariant(productId: string, data: VariantInput) {
    const response = await api.post<ApiResponse<ProductVariant>>(
      `/products/${productId}/variants`,
      data,
    );
    return response.data.data;
  },

  async updateVariant(id: string, data: Partial<VariantInput>) {
    const response = await api.put<ApiResponse<ProductVariant>>(
      `/variants/${id}`,
      data,
    );
    return response.data.data;
  },

  async deleteVariant(id: string) {
    const response = await api.delete<ApiResponse<undefined>>(`/variants/${id}`);
    return response.data;
  },
};