import axios, { AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({ baseURL: API_URL, timeout: 10000, headers: { 'Content-Type': 'application/json' } });

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  pagination?: { total: number; page: number; limit: number; pages: number };
  errors?: Array<{ field: string; message: string }>;
  timestamp: string;
}

apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<ApiResponse>) => {
    const message = error.response?.data?.message || 'Ocorreu um erro inesperado. Tente novamente.';
    const customError = new Error(message) as Error & { status?: number; errors?: unknown };
    customError.status = error.response?.status || 500;
    customError.errors = error.response?.data?.errors;
    return Promise.reject(customError);
  }
);
