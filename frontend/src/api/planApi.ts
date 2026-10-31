import { api } from './client';
import type { ApiResponse, PageResult } from './types';

export type BillingPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface PlanProduct {
  id: string;
  planId: string;
  productId: string;
  defaultQuantity: number;
  isMandatory: boolean;
  product?: { id: string; name: string; code?: string | null };
}

export interface Plan {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  billingPeriod: BillingPeriod;
  billingInterval: number;
  price: number | string;
  minQuantity: number;
  isActive: boolean;
  planProducts?: PlanProduct[];
}

export type PlanInput = Partial<
  Pick<Plan, 'code' | 'description' | 'billingPeriod' | 'billingInterval' | 'price' | 'minQuantity'>
> & { name: string };

export const planApi = {
  async list(params: { page?: number; limit?: number; search?: string; billingPeriod?: BillingPeriod } = {}) {
    const response = await api.get<ApiResponse<Plan[]>>('/plans', { params });
    return { items: response.data.data, pagination: response.data.meta };
  },
  async getById(id: string) {
    const response = await api.get<ApiResponse<Plan>>(`/plans/${id}`);
    return response.data.data;
  },
  async create(input: PlanInput) {
    const response = await api.post<ApiResponse<Plan>>('/plans', input);
    return response.data.data;
  },
  async update(id: string, input: Partial<PlanInput>) {
    const response = await api.put<ApiResponse<Plan>>(`/plans/${id}`, input);
    return response.data.data;
  },
  async deactivate(id: string) {
    const response = await api.delete<ApiResponse<undefined>>(`/plans/${id}`);
    return response.data;
  },
  async addProduct(planId: string, input: { productId: string; defaultQuantity?: number; isMandatory?: boolean }) {
    const response = await api.post<ApiResponse<PlanProduct>>(`/plans/${planId}/products`, input);
    return response.data.data;
  },
  async updateProduct(planId: string, productId: string, input: { defaultQuantity?: number; isMandatory?: boolean }) {
    const response = await api.put<ApiResponse<PlanProduct>>(`/plans/${planId}/products/${productId}`, input);
    return response.data.data;
  },
  async removeProduct(planId: string, productId: string) {
    const response = await api.delete<ApiResponse<undefined>>(`/plans/${planId}/products/${productId}`);
    return response.data;
  },
};

export type PlanPage = PageResult<Plan>;
