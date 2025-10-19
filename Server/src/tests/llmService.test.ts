import { getLLMResponse } from '../services/llmService';

describe('LLM Service', () => {
    it('should return a string response', async () => {
        const response = await getLLMResponse('Test message');
        expect(typeof response).toBe('string');
    });
});
