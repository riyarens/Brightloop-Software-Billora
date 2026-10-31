import { api } from './client';
import type { ApiResponse, PageResult } from './types';

export interface Customer {
  id: string;
  userId?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  taxId?: string | null;
  notes?: string | null;
  isActive: boolean;
}

export type CustomerUpdate = Partial<
  Pick<Customer, 'name' | 'phone' | 'company' | 'address' | 'city' | 'state' | 'postalCode' | 'country' | 'taxId' | 'notes'>
>;

export const customerApi = {
  async list(params: { page?: number; limit?: number; search?: string; isActive?: boolean } = {}) {
    const response = await api.get<ApiResponse<Customer[]>>('/customers', {
      params: {
        ...params,
        isActive: params.isActive === undefined ? undefined : String(params.isActive),
      },
    });
    return { items: response.data.data, pagination: response.data.meta };
  },
  async getById(id: string) {
    const response = await api.get<ApiResponse<Customer>>(`/customers/${id}`);
    return response.data.data;
  },
  async update(id: string, input: CustomerUpdate) {
    const response = await api.put<ApiResponse<Customer>>(`/customers/${id}`, input);
    return response.data.data;
  },
};

export type CustomerPage = PageResult<Customer>;
