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
export async function parseQuery(naturalQuery: string, conversationContext?: string): Promise<ParsedQuery> {
    const startTime = Date.now();
    console.log(`[LLM Service] Parsing query: "${naturalQuery}"`);
    if (conversationContext) {
        console.log(`[LLM Service] Using conversation context from previous queries`);
    }

    // Build system prompt with conversation context if available
    let systemPrompt = `You are a search query parser for a business community network. Parse the following natural language query and extract structured information.`;

    if (conversationContext) {
        systemPrompt += `\n\n${conversationContext}\n\nConsider the conversation history above when parsing. If the current query appears to be a follow-up question (e.g., "show me their profiles", "who are they", "what about their skills"), use the context from previous queries to understand what the user is referring to.`;
    }

    systemPrompt += `

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
// export async function generateResponse(
//     originalQuery: string,
//     results: MemberSearchResult[],
//     confidence: number
// ): Promise<string> {
//     const startTime = Date.now();
//     console.log(`[LLM Service] Generating response for ${results.length} results`);

//     // Handle no results
//     if (results.length === 0) {
//         return `I couldn't find any members matching "${originalQuery}". You might want to try searching for related skills, different locations, or browse all members.`;
//     }

//     // Prepare results summary (top 5 max)
//     const topResults = results.slice(0, 5);
//     const resultsSummary = topResults.map((member, idx) => {
//         const skills = member.skills ? ` (${member.skills.split(',').slice(0, 3).join(', ')})` : '';
//         const location = member.city ? ` - ${member.city}` : '';
//         const org = member.organization ? ` at ${member.organization}` : '';
//         return `${idx + 1}. ${member.name}${org}${location}${skills}`;
//     }).join('\n');

// const systemPrompt = `# Business Community Search Assistant - System Prompt

// You are a friendly, professional assistant for a business networking platform. 
// Your goal is to generate a short, conversational response based on the member search results provided.

// ## OBJECTIVE
// Generate a concise, natural summary that:
// 1. Acknowledges the user’s search or intent.
// 2. Mentions how many members were found.
// 3. Displays up to 3 top matches using a clear, multi-line format.
// 4. Sounds conversational, human-like, and professional.
// 5. Ends with a helpful question or suggestion for next steps.

// ## STYLE GUIDELINES
// - Tone: Friendly, professional, confident.
// - Voice: Speak naturally as “I,” the assistant.
// - Use line breaks and bullet/numbered formatting for clarity.
// - Skip missing fields gracefully (don’t show “undefined” or empty labels).

// ## DISPLAY FORMAT
// When presenting results, use this layout for each member:

// 1️⃣ **Name:** <Full Name>  
//    **Email:** <Email Address>  
//    **Contact:** <Phone Number>  
//    **Place:** <City or Location>

// (Show up to 3 members only. If more exist, mention that there are additional matches.)

// ## SPECIAL CASES
// - **1 result:** Present full details in the display format.
// - **2–5 results:** Show all results in the display format.
// - **6+ results:** Say “I found several members” and show the top 3.
// - **No results:** Politely acknowledge that and suggest refining the search.

// ## OUTPUT EXAMPLES

// **Example 1 (Single Result):**
// I found one member matching your search:

// **Name:** John Doe  
// **Email:** john.doe@example.com  
// **Contact:** +91 98765 43210  
// **Place:** Chennai  

// Would you like me to help you connect with John?

// **Example 2 (Multiple Results):**
// I found 5 members in Chennai with AI expertise. Here are the top matches:

// 1️⃣ **Name:** Sarah Lee  
//    **Email:** sarah.lee@bizconnect.com  
//    **Contact:** +91 90234 56789  
//    **Place:** Chennai  

// 2️⃣ **Name:** Ravi Kumar  
//    **Email:** ravi.kumar@innoventures.in  
//    **Contact:** +91 98765 43210  
//    **Place:** Coimbatore  

// 3️⃣ **Name:** Priya Menon  
//    **Email:** priya.menon@brandhive.com  
//    **Place:** Bengaluru  

// Would you like to view more results or connect with any of them?`


//     const userMessage = `Original Query: "${originalQuery}"
// Number of Results: ${results.length}
// Top Matches:
// ${resultsSummary}

// Generate a natural response:`;

//     try {
//         const response = await callLLM(systemPrompt, userMessage, 0.7);
//         const duration = Date.now() - startTime;
//         console.log(`[LLM Service] ✓ Response generated in ${duration}ms`);
//         return response;
//     } catch (error: any) {
//         console.error('[LLM Service] Failed to generate response:', error.message);
//         // Fallback response
//         if (results.length === 1) {
//             return `I found 1 member matching your search: ${results[0].name}${results[0].city ? ` from ${results[0].city}` : ''}. Would you like more details?`;
//         } else {
//             const topNames = topResults.map(r => r.name).slice(0, 3).join(', ');
//             return `I found ${results.length} members matching your search. Top matches include ${topNames}. Would you like to refine your search or see more details?`;
//         }
//     }
// }

export async function generateResponse(
  originalQuery: string,
  results: MemberSearchResult[],
  confidence: number
): Promise<string> {
  const startTime = Date.now();
  console.log(`[LLM Service] Generating verified response for ${results.length} results`);

  // 🧩 Handle empty results
  if (results.length === 0) {
    return `I couldn't find any members matching "${originalQuery}". Try searching with different keywords or locations.`;
  }

  // 🧠 Prepare ALL results (no limit)
  const safeResults = results.map((m, i) => ({
    id: i + 1,
    name: m.name || "",
    email: m.email || "",
    phone: m.phone || "",
    city: m.city || "",
    organization: m.organization || "",
    designation: m.designation || "",
    degree: m.degree || "",
    yearOfGraduation: m.yearOfGraduation || "",
    skills: m.skills || "",
  }));

  const systemPrompt = `
# Community Connect - Member Search Assistant

You are a helpful assistant for a professional alumni community directory.

## YOUR ROLE
Present ALL verified member search results in a simple, comma-separated format.

## OUTPUT FORMAT (CRITICAL)
Use this EXACT format for each member:

1. [Name], [Email], [Phone], [City]
2. [Name], [Email], [Phone], [City]
3. [Name], [Email], [Phone], [City]

## FORMATTING RULES
1. Start with number followed by period (1. 2. 3. etc.)
2. Separate each field with a comma and space (, )
3. Each member on a new line
4. NO bold text, NO asterisks, NO extra formatting
5. If a field is empty, skip it - don't show commas for missing fields
6. Never show "undefined", "null", "N/A", or "Na"
7. Show ALL members provided - do not limit to 3

## CONTENT RULES
- List every single member from the provided JSON data
- Never fabricate or invent information
- Keep it simple and clean
- No introductory text needed
- No closing questions needed

## EXAMPLE OUTPUT
1. Mrs. Fatima Mary, fatisttu@gmail.com, 918110073877, Sivakasi
2. Mr. John Doe, john@example.com, 919876543210, Chennai
3. Ms. Sarah Smith, sarah@test.com, 918765432109, Bangalore
`;

  const userMessage = `
User searched for: "${originalQuery}"
Total results found: ${results.length}

ALL member data (JSON):
${JSON.stringify(safeResults, null, 2)}

List ALL members in the simple comma-separated format specified.`;

  try {
    const response = await callLLM(systemPrompt, userMessage, 0.2); // Even lower temperature for exact formatting
    const duration = Date.now() - startTime;
    console.log(`[LLM Service] ✓ Verified response generated in ${duration}ms`);
    return response.trim();
  } catch (error: any) {
    console.error("[LLM Service] Fallback response used due to error:", error.message);

    // Simple fallback with comma-separated format for ALL results
    const fallbackList = safeResults
      .map((r, i) => {
        const parts = [r.name];
        if (r.email) parts.push(r.email);
        if (r.phone) parts.push(r.phone);
        if (r.city) parts.push(r.city);
        
        return `${i + 1}. ${parts.join(', ')}`;
      })
      .join('\n');

    return fallbackList;
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
  console.log(`[LLM Service] Generating refined suggestions`);

  const systemPrompt = `
You are a professional assistant for a *business networking* platform.
The user has searched for members based on certain criteria (like skills, location, or organization).
Your job is to generate 3 smart, *relevant*, and *actionable* follow-up search suggestions.

Focus on refining or extending the user's current intent.
Use information from the search results (skills, roles, cities, organizations) to stay *on-topic*.

🧭 Rules:
- Suggestions must be realistic follow-up queries that improve or narrow the search.
- Avoid vague, generic, or repetitive questions.
- Never invent unrelated topics or random cities.
- Each suggestion must make sense given the results.
- Return ONLY a raw JSON array like: ["...", "...", "..."]
`;

  // ✅ Extract contextual info from the actual results
  const cities = Array.from(
    new Set(results.map((r) => r.location).filter(Boolean))
  )
    .slice(0, 3)
    .join(", ");

  const userMessage = `
User Query: "${originalQuery}"
Number of members found: ${results.length}

Summary of result data:
- Cities: ${cities || "N/A"}

Now, generate 3 follow-up suggestions that would make sense for this user to ask next.
For example, refine by city, skill, or organization — only if those fields appear relevant.
Return a clean JSON array (no markdown, no explanation).
`;

  try {
    const response = await callLLM(systemPrompt, userMessage, 0.7);

    // ✅ Clean LLM output
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");
    } else if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, "");
    }

    const suggestions = JSON.parse(cleanedResponse);
    const duration = Date.now() - startTime;
    console.log(`[LLM Service] ✓ Smart suggestions generated in ${duration}ms`);

    if (Array.isArray(suggestions) && suggestions.length > 0) {
      return suggestions.slice(0, 3);
    }

    return getFallbackSuggestions(results);
  } catch (error: any) {
    console.error("[LLM Service] Failed to generate suggestions:", error.message);
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
