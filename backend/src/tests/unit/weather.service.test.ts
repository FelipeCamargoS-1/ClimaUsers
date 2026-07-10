import axios from 'axios';
import { WeatherService } from '../../services/weather.service';
import { weatherCache } from '../../config/cache';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const weatherApiResponse = {
  data: {
    location: { name: 'Curitiba', region: 'Paraná', lat: -25.429, lon: -49.2671 },
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
  data: [{ name: 'Curitiba', local_names: { pt: 'Curitiba' }, state: 'Paraná', lat: -25.429, lon: -49.2671 }],
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

describe('WeatherService Unit Tests', () => {
  let weatherService: WeatherService;

  beforeEach(() => {
    weatherCache.flushAll();
    mockedAxios.get.mockReset();
    mockedAxios.get.mockResolvedValue(weatherApiResponse);
    weatherService = new WeatherService();
  });

  afterAll(() => weatherCache.flushAll());

  it('should fetch and map weather data from WeatherAPI', async () => {
    const result = await weatherService.getWeather('Curitiba');

    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/forecast.json'), {
      params: expect.objectContaining({ q: 'Curitiba', days: 3, alerts: 'yes', lang: 'pt' }),
    });
    expect(result).toMatchObject({
      cidade: 'Curitiba',
      estado: 'Paraná',
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
    const firstResult = await weatherService.getWeather('Curitiba');
    weatherCache.set('weather:curitiba', { ...firstResult, temperatura: 99 });

    const secondResult = await weatherService.getWeather('Curitiba');

    expect(secondResult.temperatura).toBe(99);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('should fallback to OpenWeather when WeatherAPI rejects the key', async () => {
    mockedAxios.get
      .mockRejectedValueOnce({ response: { status: 401 }, message: 'Unauthorized' })
      .mockResolvedValueOnce(openWeatherLocationResponse)
      .mockResolvedValueOnce(openWeatherCurrentResponse)
      .mockResolvedValueOnce(openWeatherForecastResponse);

    const result = await weatherService.getWeather('Curitiba');

    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/forecast.json'), expect.any(Object));
    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/geo/1.0/direct'), expect.any(Object));
    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/weather'), expect.any(Object));
    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/forecast'), expect.any(Object));
    expect(result).toMatchObject({
      cidade: 'Curitiba',
      estado: 'Paraná',
      temperatura: 22,
      sensacaoTermica: 21,
      umidade: 69,
      pressao: 1015,
      condicao: 'nublado',
    });
    expect(result.vento).toBe(12);
    expect(result.icone).toBe('https://openweathermap.org/img/wn/04d@2x.png');
    expect(result.temperaturasPorHora).toHaveLength(8);
    expect(result.previsaoCompleta.length).toBeGreaterThan(1);
  });

  it('should return not found when no provider locates the city', async () => {
    mockedAxios.get
      .mockRejectedValueOnce({ response: { status: 401 }, message: 'Unauthorized' })
      .mockResolvedValueOnce({ data: [] });

    await expect(weatherService.getWeather('Cidade Inexistente')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('should validate empty city names before calling external APIs', async () => {
    await expect(weatherService.getWeather('   ')).rejects.toMatchObject({ statusCode: 400 });
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });
});
