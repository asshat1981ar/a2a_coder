import request from 'supertest';
import app from '../mcp/claude/server';

describe('Claude MCP Server', () => {
  it('responds to /completion with reply and memory', async () => {
    const res = await request(app)
      .post('/mcp/claude/completion')
      .send({ prompt: 'Say hello to the user.' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('reply');
    expect(res.body).toHaveProperty('memory');
  });
});
