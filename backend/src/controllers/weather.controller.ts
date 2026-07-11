import { Request, Response, NextFunction } from 'express';
import { WeatherService } from '../services/weather.service';

const weatherService = new WeatherService();

export class WeatherController {
  async getByCity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const state = typeof req.query.state === 'string' ? req.query.state : undefined;
      const stateName = typeof req.query.stateName === 'string' ? req.query.stateName : undefined;
      const weatherData = await weatherService.getWeather(req.params.city, state, stateName);
      res.status(200).json({ success: true, message: 'Previsão do tempo obtida com sucesso', data: weatherData, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export const weatherController = new WeatherController();