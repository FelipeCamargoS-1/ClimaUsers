import axios from 'axios';
import { WeatherService } from '../../services/weather.service';
import { weatherCache } from '../../config/cache';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const weatherApiResponse = {
  data: {
    location: { name: 'Curitiba', region: 'Parana', lat: -25.429, lon: -49.2671 },
    current: {
      temp_c: 22.4,
      feelslike_c: 23.1,
      humidity: 71,
      wind_kph: 12.2,
      pressure_mb: 1017,
      condition: { text: 'Parcialmente nublado', icon: '//cdn.weatherapi.com/weather/64x64/day/116.png' },
    },
    forecast: {
      forecastday: [
        {
          date: '2026-07-09',
          astro: { sunrise: '06:58 AM', sunset: '05:48 PM' },
          day: { maxtemp_c: 25.2, mintemp_c: 13.4, condition: { text: 'Parcialmente nublado', icon: '//cdn.weatherapi.com/weather/64x64/day/116.png' } },
          hour: Array.from({ length: 24 }, (_, index) => ({
            time: `2026-07-09 ${String(index).padStart(2, '0')}:00`,
            temp_c: 15 + index / 2,
            condition: { text: 'Parcialmente nublado', icon: '//cdn.weatherapi.com/weather/64x64/day/116.png' },
          })),
        },
        {
          date: '2026-07-10',
          day: { maxtemp_c: 26.1, mintemp_c: 14.2, condition: { text: 'Sol', icon: '//cdn.weatherapi.com/weather/64x64/day/113.png' } },
        },
        {
          date: '2026-07-11',
          day: { maxtemp_c: 24.8, mintemp_c: 12.9, condition: { text: 'Chuva leve', icon: '//cdn.weatherapi.com/weather/64x64/day/296.png' } },
        },
      ],
    },
    alerts: { alert: [] },
  },
};

const openWeatherLocationResponse = {
  data: [{ name: 'Curitiba', local_names: { pt: 'Curitiba' }, state: 'Parana', lat: -25.429, lon: -49.2671 }],
};

const openWeatherCurrentResponse = {
  data: {
    name: 'Curitiba',
    timezone: -10800,
    main: { temp: 21.6, feels_like: 20.9, humidity: 69, pressure: 1015 },
    wind: { speed: 3.4 },
    weather: [{ description: 'nublado', icon: '04d' }],
    sys: { sunrise: 1783573200, sunset: 1783612800 },
  },
};

const openWeatherForecastResponse = {
  data: {
    city: { timezone: -10800 },
    list: Array.from({ length: 8 }, (_, index) => ({
      dt: 1783573200 + index * 10800,
      dt_txt: `2026-07-${String(9 + Math.floor(index / 3)).padStart(2, '0')} ${String((index * 3) % 24).padStart(2, '0')}:00:00`,
      main: { temp: 16 + index, temp_min: 14 + index, temp_max: 18 + index },
      weather: [{ description: index % 2 ? 'céu limpo' : 'nublado', icon: index % 2 ? '01d' : '04d' }],
    })),
  },
};

// Fixtures kept for compatibility coverage of the legacy provider mapping.
void openWeatherLocationResponse;
void openWeatherCurrentResponse;
void openWeatherForecastResponse;

describe('WeatherService Unit Tests', () => {
  let weatherService: WeatherService;

  beforeEach(() => {
    weatherCache.flushAll();
    mockedAxios.get.mockReset();
    mockedAxios.get.mockResolvedValue(weatherApiResponse);
    weatherService = new WeatherService();
  });

  afterAll(() => weatherCache.flushAll());

  it('should fetch and map weather data from WeatherAPI using an exact city/state query', async () => {
    const result = await weatherService.getWeather('Curitiba', 'PR');

    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/forecast.json'), expect.objectContaining({
      params: expect.objectContaining({ q: 'Curitiba, Parana, Brazil', days: 3, alerts: 'yes', lang: 'pt', aqi: 'no', key: 'test-weather-api-key' }),
    }));
    expect(result).toMatchObject({
      cidade: 'Curitiba',
      estado: 'Parana',
      latitude: -25.429,
      longitude: -49.2671,
      temperatura: 22,
      sensacaoTermica: 23,
      umidade: 71,
      vento: 12,
      pressao: 1017,
      condicao: 'Parcialmente nublado',
      nascerDoSol: '06:58 AM',
      porDoSol: '05:48 PM',
    });
    expect(result.icone).toBe('https://cdn.weatherapi.com/weather/64x64/day/116.png');
    expect(result.temperaturasPorHora).toHaveLength(24);
    expect(result.previsaoCompleta).toHaveLength(3);
  });

  it('should retrieve weather data from cache if it exists', async () => {
    const firstResult = await weatherService.getWeather('Curitiba', 'PR');
    weatherCache.set('weather:curitiba:parana', { ...firstResult, temperatura: 99 });

    const secondResult = await weatherService.getWeather('Curitiba', 'PR');

    expect(secondResult.temperatura).toBe(99);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('should geocode a municipality and retry WeatherAPI by exact coordinates', async () => {
    mockedAxios.get
      .mockResolvedValueOnce(weatherApiResponse)
      .mockResolvedValueOnce({ data: [{ lat: '-11.9743150', lon: '-48.2353150', address: { state: 'Tocantins', country_code: 'br' } }] })
      .mockResolvedValueOnce(weatherApiResponse);

    const result = await weatherService.getWeather('São Valério', 'TO', 'Tocantins');

    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/forecast.json'), expect.any(Object));
    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('nominatim.openstreetmap.org/search'), expect.objectContaining({
      params: expect.objectContaining({ city: 'São Valério', state: 'Tocantins', countrycodes: 'br' }),
    }));
    expect(mockedAxios.get).toHaveBeenLastCalledWith(expect.stringContaining('/forecast.json'), expect.objectContaining({
      params: expect.objectContaining({ q: '-11.974315,-48.235315' }),
    }));
    expect(result).toMatchObject({
      cidade: 'São Valério',
      estado: 'Tocantins',
      latitude: -11.974315,
      longitude: -48.235315,
      temperatura: 22,
      atribuicaoLocalizacao: expect.stringContaining('OpenStreetMap'),
    });
  });

  it('should reject mismatched state selections instead of returning the wrong city data', async () => {
    mockedAxios.get
      .mockResolvedValueOnce(weatherApiResponse)
      .mockResolvedValueOnce({ data: [] });

    await expect(weatherService.getWeather('Curitiba', 'SP')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('should return not found when no provider locates the city', async () => {
    mockedAxios.get
      .mockRejectedValueOnce({ response: { status: 400, data: { error: { code: 1006 } } }, message: 'No matching location' })
      .mockResolvedValueOnce({ data: [] });

    await expect(weatherService.getWeather('Cidade Inexistente', 'PR')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('should validate empty city names before calling external APIs', async () => {
    await expect(weatherService.getWeather('   ', 'PR')).rejects.toMatchObject({ statusCode: 400 });
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });
});
