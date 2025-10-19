import request from 'supertest';
import app from '../app';

describe('Bot Message API', () => {
    it('should return 400 if message is missing', async () => {
        const res = await request(app).post('/api/messages').send({});
        expect(res.status).toBe(400);
    });

    it('should return a response for valid message', async () => {
        const res = await request(app).post('/api/messages').send({ message: 'Hello!' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('response');
    });
});
