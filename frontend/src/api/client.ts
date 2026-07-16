import axios, { AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function readCookie(name: string) {
  if (typeof document === 'undefined') return undefined;

  const cookies = document.cookie.split(';').map((item) => item.trim());
  const match = cookies.find((item) => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

export const apiClient = axios.create({ baseURL: API_URL, timeout: 10000, withCredentials: true, headers: { 'Content-Type': 'application/json' } });

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  pagination?: { total: number; page: number; limit: number; pages: number };
  errors?: Array<{ field: string; message: string }>;
  timestamp: string;
}

apiClient.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();
  if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfCookie = readCookie('__Host-csrf_token') ?? readCookie('csrf_token');
    const csrfToken = csrfCookie?.split('.')[0];
    if (csrfToken) {
      config.headers.set('X-CSRF-Token', csrfToken);
    }
  }

  return config;
});

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
