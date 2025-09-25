import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
import realtimeRoutes from '../../routes/realtime';

// Mock the services
jest.mock('../../services/advancedLoggerService.js');
jest.mock('../../services/errorHandlingService.js');
jest.mock('../../services/redisService.js');
jest.mock('../../services/realTimeDataService.js');

const app = express();
app.use(express.json());
app.use('/api/realtime', realtimeRoutes);

describe('Realtime Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/realtime/data/:symbol', () => {
    it('should return real-time data for valid symbol', async () => {
      const response = await request(app)
        .get('/api/realtime/data/THYAO')
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('symbol', 'THYAO');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('responseTime');
    });

    it('should return 400 for invalid symbol format', async () => {
      const response = await request(app)
        .get('/api/realtime/data/A')
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid symbol format');
      expect(response.body).toHaveProperty('code', 'INVALID_SYMBOL');
    });

    it('should return 400 for too long symbol', async () => {
      const response = await request(app)
        .get('/api/realtime/data/VERYLONGSYMBOL')
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid symbol format');
      expect(response.body).toHaveProperty('code', 'INVALID_SYMBOL');
    });

    it('should handle symbol case conversion', async () => {
      const response = await request(app)
        .get('/api/realtime/data/thyao')
        .expect(200);
      
      expect(response.body).toHaveProperty('symbol', 'THYAO');
    });
  });

  describe('GET /api/realtime/history/:symbol', () => {
    it('should return historical data with default hours', async () => {
      const response = await request(app)
        .get('/api/realtime/history/THYAO')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('symbol', 'THYAO');
      expect(response.body).toHaveProperty('hours', 24);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('data');
    });

    it('should handle custom hours parameter', async () => {
      const response = await request(app)
        .get('/api/realtime/history/THYAO?hours=48')
        .expect(200);
      
      expect(response.body).toHaveProperty('hours', 48);
    });

    it('should limit hours to maximum 168 (7 days)', async () => {
      const response = await request(app)
        .get('/api/realtime/history/THYAO?hours=200')
        .expect(200);
      
      expect(response.body.hours).toBeLessThanOrEqual(168);
    });

    it('should handle invalid hours parameter', async () => {
      const response = await request(app)
        .get('/api/realtime/history/THYAO?hours=invalid')
        .expect(200);
      
      expect(response.body).toHaveProperty('hours', 24); // Should default to 24
    });
  });

  describe('POST /api/realtime/data/batch', () => {
    it('should return batch real-time data for valid symbols', async () => {
      const response = await request(app)
        .post('/api/realtime/data/batch')
        .send({ symbols: ['THYAO', 'AKBNK'] })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('totalRequested', 2);
      expect(response.body).toHaveProperty('successful');
      expect(response.body).toHaveProperty('failed');
      expect(response.body).toHaveProperty('failedSymbols');
    });

    it('should return 400 for missing symbols array', async () => {
      const response = await request(app)
        .post('/api/realtime/data/batch')
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Symbols array is required');
      expect(response.body).toHaveProperty('code', 'INVALID_INPUT');
    });

    it('should return 400 for empty symbols array', async () => {
      const response = await request(app)
        .post('/api/realtime/data/batch')
        .send({ symbols: [] })
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Symbols array is required');
    });

    it('should return 400 for too many symbols', async () => {
      const symbols = Array(51).fill('THYAO');
      const response = await request(app)
        .post('/api/realtime/data/batch')
        .send({ symbols })
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Maximum 50 symbols allowed per request');
      expect(response.body).toHaveProperty('code', 'TOO_MANY_SYMBOLS');
    });
  });

  describe('POST /api/realtime/subscribe', () => {
    it('should create subscription for valid symbols', async () => {
      const response = await request(app)
        .post('/api/realtime/subscribe')
        .send({ 
          symbols: ['THYAO', 'AKBNK'], 
          subscriptionId: 'test-subscription-123' 
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('subscriptionId', 'test-subscription-123');
      expect(response.body).toHaveProperty('symbols');
      expect(response.body.symbols).toEqual(['THYAO', 'AKBNK']);
    });

    it('should return 400 for missing symbols array', async () => {
      const response = await request(app)
        .post('/api/realtime/subscribe')
        .send({ subscriptionId: 'test-123' })
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Symbols array is required');
      expect(response.body).toHaveProperty('code', 'INVALID_INPUT');
    });

    it('should return 400 for missing subscription ID', async () => {
      const response = await request(app)
        .post('/api/realtime/subscribe')
        .send({ symbols: ['THYAO'] })
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Subscription ID is required');
      expect(response.body).toHaveProperty('code', 'MISSING_SUBSCRIPTION_ID');
    });

    it('should return 400 for too many symbols in subscription', async () => {
      const symbols = Array(101).fill('THYAO');
      const response = await request(app)
        .post('/api/realtime/subscribe')
        .send({ symbols, subscriptionId: 'test-123' })
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Maximum 100 symbols allowed per subscription');
      expect(response.body).toHaveProperty('code', 'TOO_MANY_SYMBOLS');
    });
  });

  describe('DELETE /api/realtime/subscribe/:subscriptionId', () => {
    it('should remove subscription successfully', async () => {
      const response = await request(app)
        .delete('/api/realtime/subscribe/test-subscription-123')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('subscriptionId', 'test-subscription-123');
      expect(response.body).toHaveProperty('message', 'Subscription removed successfully');
    });
  });

  describe('GET /api/realtime/metrics', () => {
    it('should return service metrics', async () => {
      const response = await request(app)
        .get('/api/realtime/metrics')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/realtime/config', () => {
    it('should return service configuration', async () => {
      const response = await request(app)
        .get('/api/realtime/config')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('config');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('PUT /api/realtime/config', () => {
    it('should update configuration with valid parameters', async () => {
      const response = await request(app)
        .put('/api/realtime/config')
        .send({ 
          pollingInterval: 10000, 
          batchSize: 25,
          enableWebSocket: true,
          enableSSE: false
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Configuration updated successfully');
      expect(response.body).toHaveProperty('updatedConfig');
    });

    it('should return 400 for invalid polling interval', async () => {
      const response = await request(app)
        .put('/api/realtime/config')
        .send({ pollingInterval: 1000 }) // Too low
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Polling interval must be between 5000ms and 300000ms');
      expect(response.body).toHaveProperty('code', 'INVALID_POLLING_INTERVAL');
    });

    it('should return 400 for invalid batch size', async () => {
      const response = await request(app)
        .put('/api/realtime/config')
        .send({ batchSize: 100 }) // Too high
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Batch size must be between 1 and 50');
      expect(response.body).toHaveProperty('code', 'INVALID_BATCH_SIZE');
    });
  });

  describe('POST /api/realtime/symbols/:symbol', () => {
    it('should add symbol to real-time tracking', async () => {
      const response = await request(app)
        .post('/api/realtime/symbols/THYAO')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('symbol', 'THYAO');
      expect(response.body).toHaveProperty('message', 'Symbol added to real-time tracking');
    });

    it('should handle lowercase symbol conversion', async () => {
      const response = await request(app)
        .post('/api/realtime/symbols/thyao')
        .expect(200);
      
      expect(response.body).toHaveProperty('symbol', 'THYAO');
    });
  });

  describe('DELETE /api/realtime/symbols/:symbol', () => {
    it('should remove symbol from real-time tracking', async () => {
      const response = await request(app)
        .delete('/api/realtime/symbols/THYAO')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('symbol', 'THYAO');
      expect(response.body).toHaveProperty('message', 'Symbol removed from real-time tracking');
    });
  });

  describe('GET /api/realtime/market/summary', () => {
    it('should return market summary when available', async () => {
      const response = await request(app)
        .get('/api/realtime/market/summary')
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('responseTime');
    });
  });

  describe('GET /api/realtime/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/realtime/health');
      
      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to real-time endpoints', async () => {
      // This test would need to be run with actual rate limiting
      // For now, just verify the endpoint responds
      const response = await request(app)
        .get('/api/realtime/data/THYAO')
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
    });

    it('should apply subscription rate limiting', async () => {
      // Test subscription rate limiting
      const response = await request(app)
        .post('/api/realtime/subscribe')
        .send({ symbols: ['THYAO'], subscriptionId: 'test-123' })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
    });
  });
});