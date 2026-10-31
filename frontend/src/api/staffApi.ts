import { api } from './client';
import type { ApiResponse } from './types';

export interface StaffMember {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  isActive: boolean;
}

export interface StaffInput {
  email: string;
  firstName: string;
  lastName?: string;
  password: string;
}

export const staffApi = {
  async list(params: { page?: number; limit?: number; search?: string } = {}) {
    const response = await api.get<ApiResponse<StaffMember[]>>('/users/staff', { params });
    return { items: response.data.data, pagination: response.data.meta };
  },
  async create(input: StaffInput) {
    const response = await api.post<ApiResponse<StaffMember>>('/users/staff', input);
    return response.data.data;
  },
};
