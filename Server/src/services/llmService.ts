import axios from 'axios';
import { ParsedQuery, ExtractedEntities, Member, MemberSearchResult } from '../utils/types';

const DEEPINFRA_API_URL = 'https://api.deepinfra.com/v1/inference/meta-llama/Meta-Llama-3.1-8B-Instruct';

/**
 * Make a generic LLM call with system + user message
 */
async function callLLM(systemPrompt: string, userMessage: string, temperature: number = 0.3): Promise<string> {
    const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY;

    if (!DEEPINFRA_API_KEY) {
        throw new Error('DEEPINFRA_API_KEY is not configured');
    }

    // Format the input with system prompt and user message
    const formattedInput = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemPrompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${userMessage}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;

    const payload = {
        input: formattedInput,
        temperature: temperature,
        max_tokens: 1000,
        stop: [
            "<|eot_id|>",
            "<|end_of_text|>",
            "<|eom_id|>"
        ]
    };

    try {
        const response = await axios.post(DEEPINFRA_API_URL, payload, {
            headers: {
                'Authorization': `Bearer ${DEEPINFRA_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });

        const generatedText = response.data?.results?.[0]?.generated_text || '';
        return generatedText.trim();
    } catch (error: any) {
        console.error('[LLM Service] API error:', error.message);
        if (error.response) {
            console.error('[LLM Service] Error status:', error.response.status);
            console.error('[LLM Service] Error data:', JSON.stringify(error.response.data));
        }
        throw new Error('LLM API call failed');
    }
}

/**
 * Parse natural language query into structured format
 */
export async function parseQuery(naturalQuery: string): Promise<ParsedQuery> {
    const startTime = Date.now();
    console.log(`[LLM Service] Parsing query: "${naturalQuery}"`);

    const systemPrompt = `You are a search query parser for a business community network. Parse the following natural language query and extract structured information.

Extract the following in JSON format:
{
  "intent": "find_member | get_info | list_members | compare",
  "entities": {
    "skills": ["skill1", "skill2"] or null,
    "location": "city name" or null,
    "services": ["service1", "service2"] or null,
    "turnover_requirement": "high | medium | low" or null,
    "graduation_year": [year1, year2] or null,
    "degree": "degree name" or null
  },
  "search_query": "simplified search query for semantic search",
  "confidence": 0.0 to 1.0
}

Rules:
- Be GENEROUS with entity extraction - extract implied information too
- "IT industry" = extract skills: ["IT", "Information Technology", "software", "technology"]
- "consultant" = extract services: ["consulting"]
- For turnover: "good"/"high"/"successful" = high (>10Cr), "medium" = medium (2-10Cr), "low" = low (<2Cr)
- Normalize city names (e.g., "chennai" → "Chennai", "bangalore" → "Bangalore")
- For industry terms, convert to related skills and services
- Set confidence >= 0.7 for any reasonable query (only set < 0.7 if truly ambiguous like "find someone")
- search_query should be optimized for semantic similarity search - include synonyms and related terms
- Default intent is "find_member" unless clearly asking for something else

Examples:
- "IT industry" → skills: ["IT", "software", "technology"], search_query: "IT Information Technology software development"
- "consultant" → services: ["consulting"], search_query: "consultant consulting advisory"
- "AI expert" → skills: ["AI", "artificial intelligence"], search_query: "AI artificial intelligence machine learning"

Return ONLY valid JSON, no explanation or markdown formatting.`;

    try {
        const response = await callLLM(systemPrompt, naturalQuery, 0.1);

        // Clean response (remove markdown code blocks if present)
        let cleanedResponse = response.trim();
        if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
        }

        const parsed = JSON.parse(cleanedResponse);

        // Convert to our interface format
        const result: ParsedQuery = {
            intent: parsed.intent || 'find_member',
            entities: {
                skills: parsed.entities?.skills || undefined,
                location: parsed.entities?.location || undefined,
                services: parsed.entities?.services || undefined,
                turnoverRequirement: parsed.entities?.turnover_requirement || undefined,
                graduationYear: parsed.entities?.graduation_year || undefined,
                degree: parsed.entities?.degree || undefined
            },
            searchQuery: parsed.search_query || naturalQuery,
            confidence: parsed.confidence || 0.5
        };

        const duration = Date.now() - startTime;
        console.log(`[LLM Service] ✓ Query parsed in ${duration}ms, confidence: ${result.confidence}`);
        console.log(`[LLM Service] Entities:`, JSON.stringify(result.entities));

        return result;
    } catch (error: any) {
        console.error('[LLM Service] Failed to parse query:', error.message);
        
        // Return fallback parsed query with higher confidence
        // Use the natural query as-is for semantic search
        return {
            intent: 'find_member',
            entities: {},
            searchQuery: naturalQuery,
            confidence: 0.6  // Higher fallback confidence - let semantic search handle it
        };
    }
}

/**
 * Generate conversational response based on search results
 */
export async function generateResponse(
    originalQuery: string,
    results: MemberSearchResult[],
    confidence: number
): Promise<string> {
    const startTime = Date.now();
    console.log(`[LLM Service] Generating response for ${results.length} results`);

    // Handle no results
    if (results.length === 0) {
        return `I couldn't find any members matching "${originalQuery}". You might want to try searching for related skills, different locations, or browse all members.`;
    }

    // Prepare results summary (top 5 max)
    const topResults = results.slice(0, 5);
    const resultsSummary = topResults.map((member, idx) => {
        const skills = member.skills ? ` (${member.skills.split(',').slice(0, 3).join(', ')})` : '';
        const location = member.city ? ` - ${member.city}` : '';
        const org = member.organization ? ` at ${member.organization}` : '';
        return `${idx + 1}. ${member.name}${org}${location}${skills}`;
    }).join('\n');

    const systemPrompt = `You are a helpful assistant for a business community network. Generate a natural, conversational response based on the search results.

Generate a response that:
1. Acknowledges the user's request
2. Summarizes what was found (mention the count)
3. Highlights top matches (names, key skills, locations)
4. Is friendly and professional
5. Is 2-3 sentences long
6. Ends with a helpful question or suggestion

Example: "I found 5 members in Chennai with AI expertise. The top matches include John Doe (CEO with ML experience at TechCorp), Jane Smith (AI Consultant), and Mike Johnson (Data Scientist). Would you like more details about any of them?"

Keep it concise and natural. Do NOT use bullet points or lists in the response.`;

    const userMessage = `Original Query: "${originalQuery}"
Number of Results: ${results.length}
Top Matches:
${resultsSummary}

Generate a natural response:`;

    try {
        const response = await callLLM(systemPrompt, userMessage, 0.7);
        const duration = Date.now() - startTime;
        console.log(`[LLM Service] ✓ Response generated in ${duration}ms`);
        return response;
    } catch (error: any) {
        console.error('[LLM Service] Failed to generate response:', error.message);
        // Fallback response
        if (results.length === 1) {
            return `I found 1 member matching your search: ${results[0].name}${results[0].city ? ` from ${results[0].city}` : ''}. Would you like more details?`;
        } else {
            const topNames = topResults.map(r => r.name).slice(0, 3).join(', ');
            return `I found ${results.length} members matching your search. Top matches include ${topNames}. Would you like to refine your search or see more details?`;
        }
    }
}

/**
 * Generate follow-up suggestions based on query and results
 */
export async function generateSuggestions(
    originalQuery: string,
    results: MemberSearchResult[]
): Promise<string[]> {
    const startTime = Date.now();
    console.log(`[LLM Service] Generating suggestions`);

    const systemPrompt = `Based on the search query and results, suggest 3 natural follow-up questions the user might ask.

Generate 3 natural follow-up questions as a JSON array:
["suggestion 1", "suggestion 2", "suggestion 3"]

Suggestions should be:
- Natural and conversational
- Relevant to the search context
- Actionable (can be directly searched)
- Varied (different types of refinements)

Examples:
- "Show me members with higher annual turnover"
- "Find similar members in Bangalore"
- "Who has experience in both AI and consulting?"
- "List members who provide consulting services"
- "Find members graduated after 2010"

Return ONLY a JSON array, no explanation or markdown formatting.`;

    const userMessage = `Query: "${originalQuery}"
Results Found: ${results.length}
${results.length > 0 ? `Top Skills: ${Array.from(new Set(results.flatMap(r => r.skills?.split(',') || []))).slice(0, 5).join(', ')}` : ''}
${results.length > 0 ? `Cities: ${Array.from(new Set(results.map(r => r.city).filter(Boolean))).slice(0, 3).join(', ')}` : ''}

Generate 3 follow-up suggestions:`;

    try {
        const response = await callLLM(systemPrompt, userMessage, 0.8);

        // Clean response
        let cleanedResponse = response.trim();
        if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
        }

        const suggestions = JSON.parse(cleanedResponse);
        const duration = Date.now() - startTime;
        console.log(`[LLM Service] ✓ Suggestions generated in ${duration}ms`);

        if (Array.isArray(suggestions) && suggestions.length > 0) {
            return suggestions.slice(0, 3);
        }

        return getFallbackSuggestions(results);
    } catch (error: any) {
        console.error('[LLM Service] Failed to generate suggestions:', error.message);
        return getFallbackSuggestions(results);
    }
}

/**
 * Get fallback suggestions if LLM fails
 */
function getFallbackSuggestions(results: MemberSearchResult[]): string[] {
    const suggestions: string[] = [];

    if (results.length > 0) {
        // Extract unique cities
        const cities = Array.from(new Set(results.map(r => r.city).filter(Boolean)));
        if (cities.length > 1) {
            suggestions.push(`Show me members only in ${cities[0]}`);
        }

        // Extract unique skills
        const allSkills = results.flatMap(r => r.skills?.split(',').map(s => s.trim()) || []);
        const uniqueSkills = Array.from(new Set(allSkills)).slice(0, 3);
        if (uniqueSkills.length > 0) {
            suggestions.push(`Find members with ${uniqueSkills[0]} skills`);
        }

        suggestions.push('Show members with consulting services');
    } else {
        suggestions.push('Search by location (e.g., Chennai, Bangalore)');
        suggestions.push('Find members with specific skills');
        suggestions.push('Browse all members');
    }

    return suggestions.slice(0, 3);
}

/**
 * Legacy function for backward compatibility
 */
export async function getLLMResponse(message: string): Promise<string> {
    const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY;

    console.log('[getLLMResponse] All env vars:', Object.keys(process.env));
    console.log('[getLLMResponse] DEEPINFRA_API_KEY exists:', !!DEEPINFRA_API_KEY);

    if (!DEEPINFRA_API_KEY) {
        console.error('[getLLMResponse] ERROR: DEEPINFRA_API_KEY is not set!');
        return 'API key configuration error.';
    }

    const formattedInput = `<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n\n${message}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;

    const payload = {
        input: formattedInput,
        stop: [
            "<|eot_id|>",
            "<|end_of_text|>",
            "<|eom_id|>"
        ]
    };

    try {
        const response = await axios.post(DEEPINFRA_API_URL, payload, {
            headers: {
                'Authorization': `Bearer ${DEEPINFRA_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

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
