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
  atribuicaoLocalizacao?: string;
}

type WeatherLookup = {
  city: string;
  stateCode?: string;
  stateName?: string;
};

type OpenWeatherLocation = {
  name?: string;
  local_names?: Record<string, string>;
  state?: string;
  lat: number;
  lon: number;
};

type GeocodedLocation = {
  lat: string;
  lon: string;
  address?: { state?: string; country_code?: string };
};

let geocodeQueue: Promise<void> = Promise.resolve();
let lastGeocodeRequestAt = 0;

const BRAZIL_STATES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapa',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceara',
  DF: 'Distrito Federal',
  ES: 'Espirito Santo',
  GO: 'Goias',
  MA: 'Maranhao',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Para',
  PB: 'Paraiba',
  PR: 'Parana',
  PE: 'Pernambuco',
  PI: 'Piaui',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondonia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'Sao Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};

export class WeatherService {
  private readonly apiKey = env.WEATHER_API_KEY;
  private readonly weatherApiBaseUrl = 'https://api.weatherapi.com/v1';
  private readonly openWeatherGeoUrl = 'https://api.openweathermap.org/geo/1.0/direct';
  private readonly openWeatherBaseUrl = 'https://api.openweathermap.org/data/2.5';
  private readonly nominatimUrl = 'https://nominatim.openstreetmap.org/search';

  async getWeather(city: string, stateCode?: string, stateName?: string): Promise<WeatherData> {
    const requestedCity = city.trim();
    const normalizedCity = this.normalizeText(requestedCity);
    const normalizedState = this.resolveStateName(stateCode, stateName);

    if (!normalizedCity) throw new AppError('Cidade é obrigatória', 400);
    if (!this.apiKey?.trim()) throw new AppError('WEATHER_API_KEY não configurada no backend', 500);

    const cacheKey = `weather:${normalizedCity}:${this.normalizeText(normalizedState ?? 'any')}`;
    const cachedData = weatherCache.get<WeatherData>(cacheKey);
    if (cachedData) return cachedData;

    try {
      const weatherData = await this.fetchFromApi({ city: requestedCity, stateCode, stateName: normalizedState });
      weatherCache.set(cacheKey, weatherData);
      return weatherData;
    } catch (error: any) {
      logger.error(`Erro ao buscar clima para ${city}${normalizedState ? `/${normalizedState}` : ''}: ${error.message}`);
      if (error instanceof AppError) throw error;
      if (error.response?.status === 401) {
        throw new AppError('WEATHER_API_KEY inválida ou expirada. Atualize a chave da API de clima no backend.', 502);
      }
      if (error.response?.status === 400 || error.response?.status === 404) {
        throw new AppError(`Localidade "${city}${normalizedState ? `, ${normalizedState}` : ''}" não localizada no serviço de clima`, 404);
      }
      throw new AppError('Não foi possível consultar a API de clima no momento', 502);
    }
  }

  private async fetchFromApi(lookup: WeatherLookup): Promise<WeatherData> {
    try {
      return await this.fetchFromWeatherApi(lookup);
    } catch (error: any) {
      const locationNotFound =
        (error instanceof AppError && error.statusCode === 404) ||
        error.response?.data?.error?.code === 1006 ||
        error.response?.status === 404;

      if (locationNotFound) {
        const location = await this.geocodeBrazilianCity(lookup);
        return this.fetchFromWeatherApi(lookup, location, true);
      }

      throw error;
    }
  }

  private async fetchFromWeatherApi(
    lookup: WeatherLookup,
    coordinates?: { latitude: number; longitude: number },
    useRequestedLocation = false,
  ): Promise<WeatherData> {
    const response = await axios.get(`${this.weatherApiBaseUrl}/forecast.json`, {
      params: {
        key: this.apiKey,
        q: coordinates ? `${coordinates.latitude},${coordinates.longitude}` : this.buildQueryLocation(lookup),
        days: 3,
        aqi: 'no',
        alerts: 'yes',
        lang: 'pt',
      },
      timeout: 10000,
    });

    const data = response.data;
    if (!useRequestedLocation) this.assertExactLocation(data.location?.name, data.location?.region, lookup);
    const today = data.forecast.forecastday[0];

    return {
      cidade: useRequestedLocation ? lookup.city : data.location.name,
      estado: useRequestedLocation ? (lookup.stateName ?? data.location.region) : data.location.region,
      latitude: coordinates?.latitude ?? data.location.lat,
      longitude: coordinates?.longitude ?? data.location.lon,
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
      ...(useRequestedLocation ? { atribuicaoLocalizacao: 'Geocodificação © OpenStreetMap contributors' } : {}),
    };
  }

  private async geocodeBrazilianCity(lookup: WeatherLookup): Promise<{ latitude: number; longitude: number }> {
    const stateName = lookup.stateName ?? this.resolveStateName(lookup.stateCode);
    if (!stateName) throw new AppError('Estado é obrigatório para localizar o município com precisão', 400);

    const cacheKey = `geocode:${this.normalizeText(lookup.city)}:${this.normalizeText(stateName)}`;
    const cached = weatherCache.get<{ latitude: number; longitude: number }>(cacheKey);
    if (cached) return cached;

    let resolveTask!: () => void;
    const previousTask = geocodeQueue;
    geocodeQueue = new Promise<void>((resolve) => { resolveTask = resolve; });
    await previousTask;

    try {
      const elapsed = Date.now() - lastGeocodeRequestAt;
      if (elapsed < 1000) await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));

      const response = await axios.get<GeocodedLocation[]>(this.nominatimUrl, {
        params: {
          city: lookup.city,
          state: stateName,
          country: 'Brazil',
          countrycodes: 'br',
          format: 'jsonv2',
          addressdetails: 1,
          limit: 5,
        },
        headers: { 'User-Agent': 'ClimaUsers/1.0 (https://github.com/FelipeCamargoS-1/ClimaUsers)' },
        timeout: 10000,
      });
      lastGeocodeRequestAt = Date.now();

      const expectedState = this.normalizeText(stateName);
      const match = response.data.find((item) =>
        item.address?.country_code?.toLowerCase() === 'br' &&
        this.normalizeText(item.address?.state ?? '') === expectedState,
      );
      const latitude = Number(match?.lat);
      const longitude = Number(match?.lon);
      if (!match || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new AppError(`Município "${lookup.city}, ${stateName}" não localizado com coordenadas confiáveis`, 404);
      }

      const result = { latitude, longitude };
      weatherCache.set(cacheKey, result, 60 * 60 * 24 * 30);
      return result;
    } finally {
      resolveTask();
    }
  }

  private async fetchFromOpenWeather(lookup: WeatherLookup): Promise<WeatherData> {
    const locations = (
      await axios.get<OpenWeatherLocation[]>(this.openWeatherGeoUrl, {
        params: {
          q: this.buildQueryLocation(lookup, true),
          limit: 5,
          appid: this.apiKey,
        },
      })
    ).data;

    const location = this.pickExactLocation(locations, lookup);
    if (!location) {
      throw new AppError(
        `Localidade "${lookup.city}${lookup.stateName ? `, ${lookup.stateName}` : ''}" não localizada no serviço de clima`,
        404,
      );
    }

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

    const resolvedCity = location.local_names?.pt ?? location.name ?? current.name;
    const resolvedState = location.state ?? lookup.stateName ?? this.resolveStateName(lookup.stateCode);
    this.assertExactLocation(resolvedCity, resolvedState, lookup);

    return {
      cidade: resolvedCity,
      estado: resolvedState ?? '',
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

  private buildQueryLocation(lookup: WeatherLookup, includeBrazilCountryCode = false): string {
    const stateName = lookup.stateName ?? this.resolveStateName(lookup.stateCode);
    if (!stateName) return lookup.city;
    return includeBrazilCountryCode
      ? `${lookup.city},${stateName},BR`
      : `${lookup.city}, ${stateName}, Brazil`;
  }

  private resolveStateName(stateCode?: string, stateName?: string): string | undefined {
    const trimmedStateName = stateName?.trim();
    if (trimmedStateName) return trimmedStateName;

    const trimmedCode = stateCode?.trim().toUpperCase();
    if (!trimmedCode) return undefined;
    return BRAZIL_STATES[trimmedCode] ?? trimmedCode;
  }

  private pickExactLocation(locations: OpenWeatherLocation[], lookup: WeatherLookup): OpenWeatherLocation | undefined {
    if (!locations.length) return undefined;

    const expectedCity = this.normalizeText(lookup.city);
    const expectedState = this.normalizeText(lookup.stateName ?? this.resolveStateName(lookup.stateCode) ?? '');

    const exact = locations.find((location) => {
      const locationCity = this.normalizeText(location.local_names?.pt ?? location.name ?? '');
      const locationState = this.normalizeText(location.state ?? '');
      if (!locationCity || locationCity !== expectedCity) return false;
      if (!expectedState) return true;
      return locationState === expectedState;
    });

    return exact ?? (!expectedState ? locations[0] : undefined);
  }

  private assertExactLocation(actualCity: string | undefined, actualState: string | undefined, lookup: WeatherLookup): void {
    const expectedCity = this.normalizeText(lookup.city);
    const expectedState = this.normalizeText(lookup.stateName ?? this.resolveStateName(lookup.stateCode) ?? '');
    const resolvedCity = this.normalizeText(actualCity ?? '');
    const resolvedState = this.normalizeText(actualState ?? '');

    if (!resolvedCity || resolvedCity !== expectedCity) {
      throw new AppError(
        `Localidade "${lookup.city}${lookup.stateName ? `, ${lookup.stateName}` : ''}" não localizada no serviço de clima`,
        404,
      );
    }

    if (expectedState && resolvedState && resolvedState !== expectedState) {
      throw new AppError(
        `Localidade "${lookup.city}${lookup.stateName ? `, ${lookup.stateName}` : ''}" não localizada no serviço de clima`,
        404,
      );
    }
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
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
