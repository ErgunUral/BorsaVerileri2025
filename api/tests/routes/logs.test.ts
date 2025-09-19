import request from 'supertest';
import express from 'express';
import logRoutes from '../../routes/logs.js';

const app = express();
app.use(express.json());
app.use('/api/logs', logRoutes);

describe('Log Routes', () => {
  describe('GET /api/logs/metrics', () => {
    it('should return system metrics', async () => {
      const response = await request(app)
        .get('/api/logs/metrics')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('summary');
    });
  });

  describe('GET /api/logs/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/logs/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('POST /api/logs/test', () => {
    it('should create test log entry', async () => {
      const testData = {
        level: 'info',
        message: 'Test log message'
      };

      const response = await request(app)
        .post('/api/logs/test')
        .send(testData)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/logs/test')
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
    });
  });
});