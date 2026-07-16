import React, { createContext, useContext, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiResponse } from '../api/client';
import type { User } from '../types';

type AuthCredentials = { email: string; password: string };
type RegisterPayload = { name: string; email: string; password: string };

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: AuthCredentials) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await apiClient.get<unknown, ApiResponse<User>>('/auth/me');
      return response.data;
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (payload: AuthCredentials) => {
      const response = await apiClient.post<unknown, ApiResponse<User>>('/auth/login', payload);
      return response.data;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['auth', 'me'], user);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['weather'] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const response = await apiClient.post<unknown, ApiResponse<User>>('/auth/register', payload);
      return response.data;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['auth', 'me'], user);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['weather'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout');
    },
    onSuccess: async () => {
      queryClient.setQueryData(['auth', 'me'], null);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['weather'] });
    },
  });

  const value = useMemo<AuthContextValue>(() => ({
    user: sessionQuery.data ?? null,
    isLoading: sessionQuery.isLoading,
    isAuthenticated: Boolean(sessionQuery.data),
    login: (payload) => loginMutation.mutateAsync(payload),
    register: (payload) => registerMutation.mutateAsync(payload),
    logout: async () => { await logoutMutation.mutateAsync(); },
  }), [loginMutation, logoutMutation, registerMutation, sessionQuery.data, sessionQuery.isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
