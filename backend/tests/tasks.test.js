const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const Task = require('../models/Task');

// Generate a valid JWT token for authenticated requests
const testToken = jwt.sign(
  { id: '65f1a2b3c4d5e6f7a8b9c0d1', email: 'test@example.com' },
  process.env.JWT_SECRET || 'ci-test-secret-key-12345',
  { expiresIn: '1h' }
);

describe('Task Management API Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Step 2 Requirement: Testing GET /tasks endpoint returns status 200
  describe('GET /tasks', () => {
    test('GET /tasks returns 200 with valid token', async () => {
      const mockTasks = [
        { _id: '1', title: 'Task 1', description: 'Description 1', completed: false },
        { _id: '2', title: 'Task 2', description: 'Description 2', completed: true }
      ];

      jest.spyOn(Task, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockTasks)
        })
      });

      const res = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    test('GET /tasks returns 401 when no token is provided', async () => {
      const res = await request(app).get('/tasks');
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('No token provided');
    });
  });

  // Supplementary Problem: Second automated test covering a different endpoint
  describe('GET / and Healthcheck', () => {
    test('GET / returns 200 and backend status', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('Backend running');
    });
  });

  describe('POST /tasks', () => {
    test('POST /tasks returns 201 when task is created successfully', async () => {
      const newTask = {
        _id: '3',
        title: 'New Automated Task',
        description: 'Test description',
        completed: false
      };

      jest.spyOn(Task, 'create').mockResolvedValue(newTask);

      const res = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ title: 'New Automated Task', description: 'Test description' });

      expect(res.statusCode).toBe(201);
      expect(res.body.title).toBe('New Automated Task');
    });
  });
});
