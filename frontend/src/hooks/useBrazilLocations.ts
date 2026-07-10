import { useQuery } from '@tanstack/react-query';

const IBGE_API = 'https://servicodados.ibge.gov.br/api/v1/localidades';

export interface BrazilState {
  id: number;
  sigla: string;
  nome: string;
}

export interface BrazilCity {
  id: number;
  nome: string;
}

export function useBrazilStates() {
  return useQuery({
    queryKey: ['brazil-states'],
    queryFn: async () => {
      const response = await fetch(`${IBGE_API}/estados?orderBy=nome`);
      if (!response.ok) throw new Error('Não foi possível carregar os estados.');
      return response.json() as Promise<BrazilState[]>;
    },
    staleTime: Infinity,
  });
}

export function useBrazilCities(stateId: number | undefined) {
  return useQuery({
    queryKey: ['brazil-cities', stateId],
    queryFn: async () => {
      const response = await fetch(`${IBGE_API}/estados/${stateId}/municipios?orderBy=nome`);
      if (!response.ok) throw new Error('Não foi possível carregar as cidades.');
      return response.json() as Promise<BrazilCity[]>;
    },
    enabled: Boolean(stateId),
    staleTime: Infinity,
  });
}
