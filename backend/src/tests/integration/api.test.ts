import request from 'supertest';
import axios from 'axios';
import app from '../../app';
import { prisma } from '../../config/database';

jest.mock('axios');
jest.mock('../../config/database', () => ({
  prisma: {
    user: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn(), delete: jest.fn() },
    $queryRaw: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

const weatherApiResponse = {
  data: {
    location: { name: 'Curitiba', region: 'Paraná', lat: -25.429, lon: -49.2671 },
    current: { temp_c: 22.4, feelslike_c: 23.1, humidity: 71, wind_kph: 12.2, pressure_mb: 1017, condition: { text: 'Parcialmente nublado', icon: '//cdn.weatherapi.com/weather/64x64/day/116.png' } },
    forecast: {
      forecastday: [
        { date: '2026-07-09', astro: { sunrise: '06:58 AM', sunset: '05:48 PM' }, day: { maxtemp_c: 25.2, mintemp_c: 13.4, condition: { text: 'Parcialmente nublado', icon: '//cdn.weatherapi.com/weather/64x64/day/116.png' } }, hour: Array.from({ length: 24 }, (_, index) => ({ time: `2026-07-09 ${String(index).padStart(2, '0')}:00`, temp_c: 15 + index / 2, condition: { text: 'Parcialmente nublado', icon: '//cdn.weatherapi.com/weather/64x64/day/116.png' } })) },
        { date: '2026-07-10', day: { maxtemp_c: 26.1, mintemp_c: 14.2, condition: { text: 'Sol', icon: '//cdn.weatherapi.com/weather/64x64/day/113.png' } } },
        { date: '2026-07-11', day: { maxtemp_c: 24.8, mintemp_c: 12.9, condition: { text: 'Chuva leve', icon: '//cdn.weatherapi.com/weather/64x64/day/296.png' } } },
      ],
    },
    alerts: { alert: [] },
  },
};

describe('API Integration Tests', () => {
  beforeEach(() => mockedAxios.get.mockResolvedValue(weatherApiResponse));

  describe('GET /api/health', () => {
    it('should return UP and database connected on success', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '1': 1 }]);
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, message: 'Aplicação está saudável', data: { status: 'UP', database: 'connected', uptime: expect.any(Number) }, timestamp: expect.any(String) });
    });

    it('should return 500 when database query fails', async () => {
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Conexão recusada'));
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.data.status).toBe('DOWN');
      expect(response.body.data.database).toBe('disconnected');
    });
  });

  describe('GET /api/weather/:city', () => {
    it('should return weather data from WeatherAPI for a valid city', async () => {
      const response = await request(app).get('/api/weather/Curitiba');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.cidade).toBe('Curitiba');
      expect(response.body.data.estado).toBe('Paraná');
      expect(response.body.data.latitude).toBe(-25.429);
      expect(response.body.data.longitude).toBe(-49.2671);
      expect(mockedAxios.get).toHaveBeenCalled();
    });
  });

  describe('POST /api/users', () => {
    it('should return 400 when request body is invalid', async () => {
      const response = await request(app).post('/api/users').send({ name: 'Ed', email: 'invalid-email' });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Campos inválidos ou obrigatórios ausentes');
      expect(response.body.errors).toBeInstanceOf(Array);
      expect(response.body.errors.length).toBe(2);
    });

    it('should create user successfully', async () => {
      const mockUser = { id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Ana Maria', email: 'anamaria@example.com', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      const response = await request(app).post('/api/users').send({ name: 'Ana Maria', email: 'anamaria@example.com' });
      expect(response.status).toBe(201);
      expect(response.body).toEqual({ success: true, message: 'Usuário cadastrado com sucesso', data: mockUser, timestamp: expect.any(String) });
    });

    it('should return 409 if email already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Ana Maria', email: 'anamaria@example.com' });
      const response = await request(app).post('/api/users').send({ name: 'Ana Maria', email: 'anamaria@example.com' });
      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Este e-mail já está sendo utilizado por outro usuário');
    });
  });


  describe('GET /api/users', () => {
    it('should return users list with pagination', async () => {
      const mockUsers = [
        { id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Ana Maria', email: 'anamaria@example.com', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      const response = await request(app).get('/api/users').query({ page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUsers);
      expect(response.body.pagination).toEqual({ total: 1, page: 1, limit: 10, pages: 1 });
    });
  });
  describe('GET /api/users/:id', () => {
    it('should return 400 for an invalid UUID format', async () => {
      const response = await request(app).get('/api/users/not-a-uuid');
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Campos inválidos ou obrigatórios ausentes');
    });

    it('should return 404 if user is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const response = await request(app).get('/api/users/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d');
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Usuário não encontrado');
    });

    it('should return 200 and the user details on success', async () => {
      const mockUser = { id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Ana Maria', email: 'anamaria@example.com', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      const response = await request(app).get('/api/users/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUser);
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('should update a user', async () => {
      const id = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
      const currentUser = { id, name: 'Ana Maria', email: 'ana@example.com' };
      const updatedUser = { ...currentUser, name: 'Ana Souza' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(currentUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const response = await request(app).patch(`/api/users/${id}`).send({ name: 'Ana Souza' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(updatedUser);
      expect(response.body.message).toBe('Usuário atualizado com sucesso');
    });

    it('should reject an empty update', async () => {
      const response = await request(app).patch('/api/users/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d').send({});
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete a user', async () => {
      const id = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
      const user = { id, name: 'Ana Maria', email: 'ana@example.com' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prisma.user.delete as jest.Mock).mockResolvedValue(user);

      const response = await request(app).delete(`/api/users/${id}`);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
    });
  });
});


