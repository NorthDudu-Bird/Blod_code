const request = require('supertest');
const app = require('../server');
const db = require('../config/db');

// Mock database queries
jest.mock('../config/db');

describe('DELETE /posts/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return 401 when unauthenticated', async () => {
    const res = await request(app)
      .delete('/posts/123')
      .expect(401);

    expect(res.body).toEqual({
      error: 'Unauthorized',
      code: 'MISSING_AUTH_TOKEN'
    });
  });

  test('should return 400 for invalid ID format', async () => {
    const res = await request(app)
      .delete('/posts/invalid_id')
      .set('Authorization', 'Bearer valid_token')
      .expect(400);

    expect(res.body).toEqual({
      error: 'Invalid post ID format',
      code: 'INVALID_ID'
    });
  });

  test('should delete existing post', async () => {
    // Mock database responses
    db.query.mockImplementation((sql, params) => {
      if (sql.includes('SELECT')) {
        return Promise.resolve([[{ id: params[0] }]]);
      }
      return Promise.resolve([{ affectedRows: 1 }]);
    });

    const res = await request(app)
      .delete('/posts/123')
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      message: 'Post deleted successfully',
      deletedId: '123'
    });
  });

  test('should return 404 when deleting non-existent post', async () => {
    db.query.mockResolvedValueOnce([[]]); // Empty SELECT result

    const res = await request(app)
      .delete('/posts/999')
      .expect(404);

    expect(res.body).toEqual({ error: 'Post not found' });
  });

  test('should handle database errors', async () => {
    db.query.mockRejectedValueOnce(new Error('Connection failed'));

    const res = await request(app)
      .delete('/posts/123')
      .expect(500);

    expect(res.body).toEqual({
      error: 'Internal server error',
      code: 'DB_DELETE_FAILURE'
    });
  });
});