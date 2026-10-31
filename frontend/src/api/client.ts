import axios from 'axios';

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
  .replace(/\/+$/, '');

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

const publicAuthPath = /\/auth\/(login|register|forgot-password|reset-password)$/;

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !publicAuthPath.test(error.config?.url ?? '')
    ) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.dispatchEvent(new Event('billora:unauthorized'));
    }

    return Promise.reject(error);
  },
);

export function errMsg(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as
      | { message?: unknown; errors?: Array<{ field?: string; message?: string }> }
      | undefined;
    if (typeof body?.message === 'string') {
      const details = body.errors
        ?.filter((item) => typeof item.message === 'string')
        .map((item) => `${item.field ? `${item.field}: ` : ''}${item.message}`)
        .join('; ');
      return details ? `${body.message}: ${details}` : body.message;
    }
    return error.message || 'The request failed';
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}
