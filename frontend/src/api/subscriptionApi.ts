import { api } from './client';
import type { ApiResponse, PageResult } from './types';

export type SubscriptionStatus = 'DRAFT' | 'QUOTATION' | 'CONFIRMED' | 'ACTIVE' | 'CLOSED';

export interface Subscription {
  id: string;
  subscriptionNumber: string;
  status: SubscriptionStatus;
  isPaused: boolean;
  customerId: string;
  planId: string;
  paymentTerms?: string;
  autoRenew?: boolean;
  notes?: string | null;
  customer?: { id: string; name: string; email: string };
  plan?: { id: string; name: string; billingPeriod: string; price: number | string };
  lines?: Array<{ id: string; product: { name: string }; quantity: number; total: number | string }>;
  startDate?: string;
  expiryDate?: string | null;
}

export interface SubscriptionInput {
  customerId: string;
  planId: string;
  startDate?: string;
  expiryDate?: string | null;
  paymentTerms?: string;
  autoRenew?: boolean;
  notes?: string;
  lines: Array<{
    productId: string;
    variantId?: string | null;
    quantity: number;
    taxId?: string | null;
    discountId?: string | null;
    description?: string;
  }>;
}

export const subscriptionApi = {
  async list(params: { page?: number; limit?: number; search?: string; status?: SubscriptionStatus } = {}) {
    const response = await api.get<ApiResponse<Subscription[]>>('/subscriptions', { params });
    return { items: response.data.data, pagination: response.data.meta };
  },
  async getById(id: string) {
    const response = await api.get<ApiResponse<Subscription>>(`/subscriptions/${id}`);
    return response.data.data;
  },
  async create(input: SubscriptionInput) {
    const response = await api.post<ApiResponse<Subscription>>('/subscriptions', input);
    return response.data.data;
  },
  async update(id: string, input: { paymentTerms?: string; autoRenew?: boolean; notes?: string }) {
    const response = await api.put<ApiResponse<Subscription>>(`/subscriptions/${id}`, input);
    return response.data.data;
  },
  async updateStatus(id: string, status: SubscriptionStatus, note?: string) {
    const response = await api.patch<ApiResponse<Subscription>>(`/subscriptions/${id}/status`, { status, note });
    return response.data.data;
  },
  async pause(id: string, reason?: string) {
    const response = await api.post<ApiResponse<Subscription>>(`/subscriptions/${id}/pause`, { reason });
    return response.data.data;
  },
  async resume(id: string) {
    const response = await api.post<ApiResponse<Subscription>>(`/subscriptions/${id}/resume`);
    return response.data.data;
  },
  async renew(id: string) {
    const response = await api.post<ApiResponse<Subscription>>(`/subscriptions/${id}/renew`);
    return response.data.data;
  },
  async close(id: string, reason?: string) {
    const response = await api.post<ApiResponse<Subscription>>(`/subscriptions/${id}/close`, { reason });
    return response.data.data;
  },
};

export type SubscriptionPage = PageResult<Subscription>;
