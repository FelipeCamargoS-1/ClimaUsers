export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface HourlyWeather {
  hora: string;
  temperatura: number;
  condicao: string;
  icone: string;
}

export interface DailyForecast {
  data: string;
  maxima: number;
  minima: number;
  condicao: string;
  icone: string;
}

export interface WeatherData {
  cidade: string;
  estado: string;
  latitude: number;
  longitude: number;
  temperatura: number;
  sensacaoTermica: number;
  umidade: number;
  vento: number;
  pressao: number;
  condicao: string;
  icone: string;
  nascerDoSol: string;
  porDoSol: string;
  temperaturasPorHora: HourlyWeather[];
  previsaoCompleta: DailyForecast[];
  alertas: string[];
}
