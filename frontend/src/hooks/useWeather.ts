import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ApiResponse } from '../api/client';
import type { WeatherData } from '../types';

type WeatherQueryParams = {
  city: string;
  stateCode: string;
  stateName: string;
};

export function useWeatherQuery(params: WeatherQueryParams) {
  const normalizedCity = params.city.trim();
  const normalizedStateCode = params.stateCode.trim();
  const normalizedStateName = params.stateName.trim();

  return useQuery({
    queryKey: ['weather', normalizedCity.toLowerCase(), normalizedStateCode.toLowerCase()],
    queryFn: async () => {
      const response = await apiClient.get<unknown, ApiResponse<WeatherData>>(
        `/weather/${encodeURIComponent(normalizedCity)}?state=${encodeURIComponent(normalizedStateCode)}&stateName=${encodeURIComponent(normalizedStateName)}`,
      );
      return response.data;
    },
    enabled: normalizedCity.length >= 2 && normalizedStateCode.length >= 2 && normalizedStateName.length >= 2,
    staleTime: 300000,
    retry: 1,
  });
}