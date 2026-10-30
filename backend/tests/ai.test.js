const request = require('supertest');
const app = require('../server');
const aiRoutes = require('../routes/ai');

describe('AI Route Integration Tests', () => {
  const originalOpenAIKey = process.env.OPENAI_API_KEY;
  const originalGeminiKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalOpenAIKey;
    process.env.GEMINI_API_KEY = originalGeminiKey;
    jest.restoreAllMocks();
  });

  describe('POST /api/ai/generate-description', () => {
    test('returns 400 if title is missing or empty', async () => {
      const res = await request(app)
        .post('/api/ai/generate-description')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Invalid request');
      expect(res.body.message).toMatch(/title is required/i);
    });

    test('gracefully degrades to fallback if no API key is configured', async () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const res = await request(app)
        .post('/api/ai/generate-description')
        .set('x-forwarded-for', 'client-fallback-1')
        .send({ title: 'Fix login authentication bug' });

      expect(res.statusCode).toBe(200);
      expect(res.body.fallback).toBe(true);
      expect(res.body.description).toBeTruthy();
      expect(res.body.description).toContain('Fix login authentication bug');
    });

    test('gracefully degrades without crashing when external AI service throws an error', async () => {
      process.env.OPENAI_API_KEY = 'sk-invalid-test-key';

      jest.spyOn(aiRoutes.aiService, 'callOpenAI').mockRejectedValue(
        new Error('401 Incorrect API key provided')
      );

      const res = await request(app)
        .post('/api/ai/generate-description')
        .set('x-forwarded-for', 'client-fallback-2')
        .send({ title: 'Deploy new release to production' });

      expect(res.statusCode).toBe(200);
      expect(res.body.fallback).toBe(true);
      expect(res.body.description).toBeTruthy();
      expect(res.body.message).toMatch(/unavailable or encountered an error/i);
    });

    test('returns generated description successfully when OpenAI responds', async () => {
      process.env.OPENAI_API_KEY = 'sk-valid-mock-key';

      jest.spyOn(aiRoutes.aiService, 'callOpenAI').mockResolvedValue(
        'Prepare database migrations and trigger CI/CD deployment pipeline.'
      );

      const res = await request(app)
        .post('/api/ai/generate-description')
        .set('x-forwarded-for', 'client-success-1')
        .send({ title: 'Run database migration' });

      expect(res.statusCode).toBe(200);
      expect(res.body.fallback).toBe(false);
      expect(res.body.provider).toBe('openai');
      expect(res.body.description).toBe('Prepare database migrations and trigger CI/CD deployment pipeline.');
    });

    test('enforces rate limiting when requests arrive too rapidly', async () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const clientIp = '198.51.100.42';

      // First request
      const firstRes = await request(app)
        .post('/api/ai/generate-description')
        .set('x-forwarded-for', clientIp)
        .send({ title: 'Task 1' });

      expect(firstRes.statusCode).toBe(200);

      // Immediate second request from same client IP
      const secondRes = await request(app)
        .post('/api/ai/generate-description')
        .set('x-forwarded-for', clientIp)
        .send({ title: 'Task 2' });

      expect(secondRes.statusCode).toBe(429);
      expect(secondRes.body.fallback).toBe(true);
      expect(secondRes.body.message).toMatch(/Rate limit reached/i);
    });
  });

  describe('GET /api/ai/status', () => {
    test('returns service health and configuration status', async () => {
      const res = await request(app).get('/api/ai/status');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('configured');
      expect(res.body).toHaveProperty('provider');
      expect(res.body).toHaveProperty('rateLimitWindowSeconds');
    });
  });
});
