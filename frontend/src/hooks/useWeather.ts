import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ApiResponse } from '../api/client';
import type { WeatherData } from '../types';

export function useWeatherQuery(city: string) {
  const normalizedCity = city.trim();
  return useQuery({
    queryKey: ['weather', normalizedCity.toLowerCase()],
    queryFn: async () => {
      const response = await apiClient.get<unknown, ApiResponse<WeatherData>>(`/weather/${encodeURIComponent(normalizedCity)}`);
      return response.data;
    },
    enabled: normalizedCity.length >= 2,
    staleTime: 300000,
    retry: 1,
  });
}
