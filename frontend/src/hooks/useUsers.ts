import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ApiResponse } from '../api/client';
import type { User } from '../types';

export interface UseUsersListParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
  name?: string;
  email?: string;
}

export function useUsersList(params: UseUsersListParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => apiClient.get<unknown, ApiResponse<User[]>>('/users', { params }),
    placeholderData: (previousData) => previousData,
    staleTime: 30000,
  });
}

export function useUserDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      if (!id) throw new Error('ID do usuário é obrigatório');
      const response = await apiClient.get<unknown, ApiResponse<User>>(`/users/${id}`);
      return response.data;
    },
    enabled: Boolean(id),
    staleTime: 300000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userData: { name: string; email: string }) => {
      const response = await apiClient.post<unknown, ApiResponse<User>>('/users', userData);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; email: string } }) => {
      const response = await apiClient.patch<unknown, ApiResponse<User>>(`/users/${id}`, data);
      return response.data;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['user', user.id], user);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: (_response, id) => {
      queryClient.removeQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
