import { jest } from '@jest/globals';

process.env.PORT = '3001';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://weather_app:weather_password@localhost:5432/weather_users_test?schema=public';
process.env.WEATHER_API_KEY = 'test-weather-api-key';

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
  },
}));

