import axios from 'axios';
import { MessageRequest } from '../models/message';

const DEEPINFRA_API_URL = 'https://api.deepinfra.com/v1/inference/meta-llama/Meta-Llama-3.1-8B-Instruct';

export async function getLLMResponse(message: string): Promise<string> {
    // Read API key at runtime, not at module load time
    const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY;

    console.log('[getLLMResponse] All env vars:', Object.keys(process.env));
    console.log('[getLLMResponse] DEEPINFRA_API_KEY exists:', !!DEEPINFRA_API_KEY);
    console.log('[getLLMResponse] API Key value:', DEEPINFRA_API_KEY);

    if (!DEEPINFRA_API_KEY) {
        console.error('[getLLMResponse] ERROR: DEEPINFRA_API_KEY is not set!');
        return 'API key configuration error.';
    }

    // Payload for DeepInfra Llama 3.1 8B Instruct
    // Format the input according to DeepInfra's requirements with proper prompt template
    const formattedInput = `<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n\n${message}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;

    const payload = {
        input: formattedInput,
        stop: [
            "<|eot_id|>",
            "<|end_of_text|>",
            "<|eom_id|>"
        ]
    };
    console.log(`[getLLMResponse] Using API Key: ${DEEPINFRA_API_KEY.substring(0, 5)}...`);
    console.log(`[getLLMResponse] Payload:`, JSON.stringify(payload));

    try {
        const response = await axios.post(DEEPINFRA_API_URL, payload, {
            headers: {
                'Authorization': `Bearer ${DEEPINFRA_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`[getLLMResponse] Response data:`, JSON.stringify(response.data));

        // DeepInfra returns the response in results[0].generated_text
        const generatedText = response.data?.results?.[0]?.generated_text || '';
        return generatedText;
    } catch (error: any) {
        console.error('[getLLMResponse] LLM API error:', error.message);
        if (error.response) {
            console.error('[getLLMResponse] Error status:', error.response.status);
            console.error('[getLLMResponse] Error data:', JSON.stringify(error.response.data));
        }
        return 'Sorry, I could not process your request.';
    }
}
