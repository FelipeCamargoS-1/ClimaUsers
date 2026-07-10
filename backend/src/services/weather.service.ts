import axios from 'axios';
import { env } from '../config/env';
import { weatherCache } from '../config/cache';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

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
  temperaturasPorHora: Array<{ hora: string; temperatura: number; condicao: string; icone: string }>;
  previsaoCompleta: Array<{ data: string; maxima: number; minima: number; condicao: string; icone: string }>;
  alertas: string[];
}

export class WeatherService {
  private readonly apiKey = env.WEATHER_API_KEY;
  private readonly weatherApiBaseUrl = 'http://api.weatherapi.com/v1';
  private readonly openWeatherGeoUrl = 'https://api.openweathermap.org/geo/1.0/direct';
  private readonly openWeatherBaseUrl = 'https://api.openweathermap.org/data/2.5';

  async getWeather(city: string): Promise<WeatherData> {
    const normalizedCity = city.trim();
    if (!normalizedCity) throw new AppError('Cidade é obrigatória', 400);
    if (!this.apiKey) throw new AppError('WEATHER_API_KEY não configurada no backend', 500);

    const cacheKey = `weather:${normalizedCity.toLowerCase()}`;
    const cachedData = weatherCache.get<WeatherData>(cacheKey);
    if (cachedData) return cachedData;

    try {
      const weatherData = await this.fetchFromApi(normalizedCity);
      weatherCache.set(cacheKey, weatherData);
      return weatherData;
    } catch (error: any) {
      logger.error(`Erro ao buscar clima para ${normalizedCity}: ${error.message}`);
      if (error instanceof AppError) throw error;
      if (error.response?.status === 400 || error.response?.status === 404) {
        throw new AppError(`Cidade "${normalizedCity}" não localizada no serviço de clima`, 404);
      }
      throw new AppError('Não foi possível consultar a API de clima no momento', 502);
    }
  }

  private async fetchFromApi(city: string): Promise<WeatherData> {
    try {
      return await this.fetchFromWeatherApi(city);
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return this.fetchFromOpenWeather(city);
      }

      throw error;
    }
  }

  private async fetchFromWeatherApi(city: string): Promise<WeatherData> {
    const response = await axios.get(`${this.weatherApiBaseUrl}/forecast.json`, {
      params: { key: this.apiKey, q: city, days: 3, aqi: 'no', alerts: 'yes', lang: 'pt' },
    });

    const data = response.data;
    const today = data.forecast.forecastday[0];

    return {
      cidade: data.location.name,
      estado: data.location.region,
      latitude: data.location.lat,
      longitude: data.location.lon,
      temperatura: Math.round(data.current.temp_c),
      sensacaoTermica: Math.round(data.current.feelslike_c),
      umidade: data.current.humidity,
      vento: Math.round(data.current.wind_kph),
      pressao: data.current.pressure_mb,
      condicao: data.current.condition.text,
      icone: this.normalizeWeatherApiIcon(data.current.condition.icon),
      nascerDoSol: today.astro.sunrise,
      porDoSol: today.astro.sunset,
      temperaturasPorHora: today.hour.map((hour: any) => ({
        hora: hour.time.split(' ')[1] || '00:00',
        temperatura: Math.round(hour.temp_c),
        condicao: hour.condition.text,
        icone: this.normalizeWeatherApiIcon(hour.condition.icon),
      })),
      previsaoCompleta: data.forecast.forecastday.map((day: any) => ({
        data: day.date.split('-').reverse().slice(0, 2).join('/'),
        maxima: Math.round(day.day.maxtemp_c),
        minima: Math.round(day.day.mintemp_c),
        condicao: day.day.condition.text,
        icone: this.normalizeWeatherApiIcon(day.day.condition.icon),
      })),
      alertas: data.alerts?.alert?.map((alert: any) => `${alert.event}: ${alert.headline || alert.desc}`) ?? [],
    };
  }

  private async fetchFromOpenWeather(city: string): Promise<WeatherData> {
    const [location] = (
      await axios.get(this.openWeatherGeoUrl, {
        params: { q: `${city},BR`, limit: 1, appid: this.apiKey },
      })
    ).data;

    if (!location) throw new AppError(`Cidade "${city}" não localizada no serviço de clima`, 404);

    const [currentResponse, forecastResponse] = await Promise.all([
      axios.get(`${this.openWeatherBaseUrl}/weather`, {
        params: { lat: location.lat, lon: location.lon, appid: this.apiKey, units: 'metric', lang: 'pt_br' },
      }),
      axios.get(`${this.openWeatherBaseUrl}/forecast`, {
        params: { lat: location.lat, lon: location.lon, appid: this.apiKey, units: 'metric', lang: 'pt_br' },
      }),
    ]);

    const current = currentResponse.data;
    const forecast = forecastResponse.data;
    const forecastItems = forecast.list ?? [];

    return {
      cidade: location.local_names?.pt ?? location.name ?? current.name,
      estado: location.state ?? '',
      latitude: location.lat,
      longitude: location.lon,
      temperatura: Math.round(current.main.temp),
      sensacaoTermica: Math.round(current.main.feels_like),
      umidade: current.main.humidity,
      vento: Math.round((current.wind?.speed ?? 0) * 3.6),
      pressao: current.main.pressure,
      condicao: current.weather?.[0]?.description ?? '',
      icone: this.openWeatherIcon(current.weather?.[0]?.icon),
      nascerDoSol: this.formatTime(current.sys?.sunrise, current.timezone),
      porDoSol: this.formatTime(current.sys?.sunset, current.timezone),
      temperaturasPorHora: forecastItems.slice(0, 8).map((item: any) => ({
        hora: item.dt_txt?.split(' ')[1]?.slice(0, 5) ?? this.formatTime(item.dt, forecast.city?.timezone),
        temperatura: Math.round(item.main.temp),
        condicao: item.weather?.[0]?.description ?? '',
        icone: this.openWeatherIcon(item.weather?.[0]?.icon),
      })),
      previsaoCompleta: this.groupOpenWeatherForecast(forecastItems),
      alertas: [],
    };
  }

  private normalizeWeatherApiIcon(icon: string): string {
    return icon.startsWith('//') ? `https:${icon}` : icon;
  }

  private openWeatherIcon(icon?: string): string {
    return icon ? `https://openweathermap.org/img/wn/${icon}@2x.png` : '';
  }

  private formatTime(timestamp?: number, timezoneOffset = 0): string {
    if (!timestamp) return '';
    return new Date((timestamp + timezoneOffset) * 1000).toISOString().slice(11, 16);
  }

  private groupOpenWeatherForecast(items: any[]): WeatherData['previsaoCompleta'] {
    const groupedByDay = items.reduce<Record<string, any[]>>((acc, item) => {
      const date = item.dt_txt?.split(' ')[0];
      if (!date) return acc;
      acc[date] = [...(acc[date] ?? []), item];
      return acc;
    }, {});

    return Object.entries(groupedByDay)
      .slice(0, 3)
      .map(([date, dayItems]) => {
        const temperatures = dayItems.flatMap((item) => [item.main.temp_min, item.main.temp_max]);
        const representative = dayItems[Math.floor(dayItems.length / 2)] ?? dayItems[0];

        return {
          data: date.split('-').reverse().slice(0, 2).join('/'),
          maxima: Math.round(Math.max(...temperatures)),
          minima: Math.round(Math.min(...temperatures)),
          condicao: representative.weather?.[0]?.description ?? '',
          icone: this.openWeatherIcon(representative.weather?.[0]?.icon),
        };
      });
  }
}
