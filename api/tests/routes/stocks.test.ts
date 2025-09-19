import request from 'supertest';
import express from 'express';
import stockRoutes from '../../routes/stocks.js';

const app = express();
app.use(express.json());
app.use('/api/stocks', stockRoutes);

describe('Stock Routes', () => {
  describe('GET /api/stocks/popular', () => {
    it('should return popular stocks', async () => {
      const response = await request(app)
        .get('/api/stocks/popular')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('count');
    });
  });

  describe('GET /api/stocks/price/:stockCode', () => {
    it('should return stock price for valid code', async () => {
      const response = await request(app)
        .get('/api/stocks/price/THYAO')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('stockCode', 'THYAO');
    });

    it('should handle invalid stock code', async () => {
      const response = await request(app)
        .get('/api/stocks/price/INVALID')
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('GET /api/stocks/analysis/:stockCode', () => {
    it('should return stock analysis', async () => {
      const response = await request(app)
        .get('/api/stocks/analysis/THYAO')
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
    });
  });
});