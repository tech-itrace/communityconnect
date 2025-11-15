import axios from 'axios';
import { ParsedQuery, ExtractedEntities, Member, MemberSearchResult } from '../utils/types';
import { classifyIntent, Intent, IntentResult } from './intentClassifier';
import { getLLMFactory, LLMProviderError } from './llm';

// ============================================================================
// NORMALIZATION CONSTANTS
// ============================================================================

const CITY_NORMALIZATION: Record<string, string> = {
  'chennai': 'Chennai',
  'bangalore': 'Bangalore',
  'bengaluru': 'Bangalore',
  'mumbai': 'Mumbai',
  'delhi': 'Delhi',
  'hyderabad': 'Hyderabad',
  'pune': 'Pune',
  'coimbatore': 'Coimbatore'
};

const BRANCH_NORMALIZATION: Record<string, string> = {
  'mechanical': 'Mechanical',
  'mech': 'Mechanical',
  'civil': 'Civil',
  'ece': 'ECE',
  'electronics': 'ECE',
  'cse': 'CSE',
  'computer science': 'CSE',
  'it': 'IT',
  'information technology': 'IT',
  'eee': 'EEE',
  'electrical': 'EEE'
};

// ============================================================================
// DOMAIN-SPECIFIC PROMPTS BY INTENT
// ============================================================================

/**
 * Get domain-specific extraction rules based on intent (CONDENSED)
 */
function getDomainSpecificRules(intent: Intent): string {
  const baseRules = `
**DATABASE FIELDS**:
year_of_graduation, degree, branch, working_knowledge, city, organization_name, designation, annual_turnover

**KEY MAPPINGS**:
- "passout"/"batch"/"graduated" → year_of_graduation
- "mechanical"/"civil"/"ECE" → branch
- "web dev"/"IT"/"consulting" → working_knowledge
- "Chennai"/"Bangalore" → city (capitalize)
- "95" → 1995, "98" → 1998 (year normalization)
`;

  switch (intent) {
    case 'find_business':
      return baseRules + `
**BUSINESS RULES**:
Extract service/industry keywords to working_knowledge.
Example: "web dev company Chennai" → {"working_knowledge":["web development","website"],"city":"Chennai"}`;

    case 'find_peers':
      return baseRules + `
**ALUMNI RULES**:
Extract year and branch. "1995 passout mechanical" → {"year_of_graduation":[1995],"branch":["Mechanical"]}`;

    case 'find_specific_person':
      return baseRules + `
**PERSON RULES**:
Extract name. "Find Sivakumar from USAM" → {"name":"Sivakumar","organization_name":"USAM"}`;

    case 'find_alumni_business':
      return baseRules + `
**ALUMNI+BUSINESS RULES**:
Extract both. "1995 batch IT services" → {"year_of_graduation":[1995],"working_knowledge":["IT"]}`;

    default:
      return baseRules;
  }
}

/**
 * Build compact system prompt
 */
function buildSystemPrompt(intent: Intent, conversationContext?: string): string {
  let prompt = `Extract entities from query for alumni/business directory search.

${getDomainSpecificRules(intent)}`;

  if (conversationContext) {
    prompt += `\nContext: ${conversationContext.substring(0, 200)}`;
  }

  prompt += `

Output JSON:
{
  "entities": {
    "year_of_graduation": [year] or null,
    "branch": ["name"] or null,
    "working_knowledge": ["skill"] or null,
    "city": "Name" or null,
    "organization_name": "Name" or null,
    "name": "PersonName" or null
  },
  "search_query": "optimized text",
  "confidence": 0-1
}

Rules: Extract all entities, normalize values, be generous. JSON only.`;

  return prompt;
}

/**
 * Make a generic LLM call with system + user message (using LLM factory)
 */
async function callLLM(systemPrompt: string, userMessage: string, temperature: number = 0.3): Promise<string> {
  try {
    const llmFactory = getLLMFactory();

    const response = await llmFactory.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature,
      maxTokens: 1000,
      stopSequences: ["<|eot_id|>", "<|end_of_text|>", "<|eom_id|>"]
    });

    return response.text;
  } catch (error) {
    if (error instanceof LLMProviderError) {
      console.error(`[LLM Service] All providers failed: ${error.message}`);
    } else {
      console.error('[LLM Service] Unexpected error:', error);
    }
    throw new Error('LLM API call failed');
  }
}

/**
 * Parse natural language query into structured format
 * Now uses intent classification to provide domain-specific prompts
 */
export async function parseQuery(naturalQuery: string, conversationContext?: string): Promise<ParsedQuery> {
  const startTime = Date.now();
  console.log(`[LLM Service] Parsing query: "${naturalQuery}"`);

  // Step 1: Classify intent using Naive Bayes
  const intentResult = await classifyIntent(naturalQuery);
  console.log(`[LLM Service] Intent classified: ${intentResult.primary} (confidence: ${intentResult.confidence})`);

  if (conversationContext) {
    console.log(`[LLM Service] Using conversation context from previous queries`);
  }

  // Step 2: Build intent-specific system prompt
  const systemPrompt = buildSystemPrompt(intentResult.primary, conversationContext);

  try {
    const response = await callLLM(systemPrompt, naturalQuery, 0.1);

    console.log(`[LLM Service] Raw response:`, response.substring(0, 200));

    // Clean response - extract JSON from various markdown formats
    let cleanedResponse = response.trim();

    // Remove markdown code blocks
    cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // Try to extract JSON object from text (look for first { to last })
    const firstBrace = cleanedResponse.indexOf('{');
    const lastBrace = cleanedResponse.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
    }

    console.log(`[LLM Service] Cleaned response:`, cleanedResponse.substring(0, 200));

    const parsed = JSON.parse(cleanedResponse);

    console.log(`[LLM Service] Parsed entities:`, JSON.stringify(parsed.entities));

    // Convert to our interface format with intent from classifier
    const result: ParsedQuery = {
      intent: intentResult.primary, // Use classified intent, not LLM's
      entities: {
        skills: parsed.entities?.working_knowledge || undefined,
        location: parsed.entities?.city || undefined,
        services: parsed.entities?.working_knowledge || undefined,
        turnoverRequirement: parsed.entities?.annual_turnover || undefined,
        graduationYear: parsed.entities?.year_of_graduation || undefined,
        degree: parsed.entities?.degree || undefined,
        branch: parsed.entities?.branch || undefined,
        name: parsed.entities?.name || undefined,
        organizationName: parsed.entities?.organization_name || undefined
      },
      searchQuery: parsed.search_query || naturalQuery,
      confidence: Math.max(parsed.confidence || 0.5, intentResult.confidence), // Use higher confidence
      intentMetadata: {
        primary: intentResult.primary,
        secondary: intentResult.secondary,
        intentConfidence: intentResult.confidence,
        matchedPatterns: intentResult.matchedPatterns
      }
    };

    const duration = Date.now() - startTime;
    console.log(`[LLM Service] ✓ Query parsed in ${duration}ms, confidence: ${result.confidence}`);
    console.log(`[LLM Service] Entities:`, JSON.stringify(result.entities));

    return result;
  } catch (error: any) {
    console.error('[LLM Service] Failed to parse query:', error.message);
    console.error('[LLM Service] Error stack:', error.stack);

    // Return fallback with intent classification
    return {
      intent: intentResult.primary,
      entities: {},
      searchQuery: naturalQuery,
      confidence: Math.max(0.6, intentResult.confidence), // Use intent confidence
      intentMetadata: {
        primary: intentResult.primary,
        secondary: intentResult.secondary,
        intentConfidence: intentResult.confidence,
        matchedPatterns: intentResult.matchedPatterns
      }
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

  if (results.length === 0) {
    return `I couldn't find any members matching "${originalQuery}". Try different keywords or locations.`;
  }

  const systemPrompt = `
You are a member search assistant. Format results as simple comma-separated lines.
Each line: Number. Name, Email, Phone, City
Show ALL members provided. No bold, no markdown, no extra text.`;

  const safeResults = results.slice(0, 50).map((r, i) => ({
    id: i + 1,
    name: r.name || '',
    email: r.email || '',
    phone: r.phone || '',
    city: r.city || '',
  }));

  const userMessage = `Format these ${safeResults.length} members as simple lines:\n${JSON.stringify(safeResults)}`;

  try {
    const response = await callLLM(systemPrompt, userMessage, 0.2);
    console.log(`[LLM Service] ✓ Response generated in ${Date.now() - startTime}ms`);
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
    console.error('[LLM Service] Response generation failed:', error.message);
    // Fallback
    return safeResults
      .map(r => `${r.id}. ${r.name}, ${r.email}, ${r.phone}, ${r.city}`)
      .join('\n');
  }
}

// =====================================================================
// SUGGESTIONS
// =====================================================================

export async function generateSuggestions(originalQuery: string, results: MemberSearchResult[]): Promise<string[]> {
  const startTime = Date.now();

  const systemPrompt = `Generate 3 relevant follow-up search suggestions based on results. Return JSON array only: ["...", "...", "..."]`;

  const userMessage = `Query: "${originalQuery}", Found: ${results.length} members. Suggestions?`;

  try {
    const response = await callLLM(systemPrompt, userMessage, 0.7);
    // Try to parse JSON from response
    let suggestions: any;
    try {
      // Extract JSON from markdown or plain response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);
    } catch {
      suggestions = getFallbackSuggestions(results);
    }
    console.log(`[LLM Service] ✓ Suggestions in ${Date.now() - startTime}ms`);
    return Array.isArray(suggestions) ? suggestions.slice(0, 3) : getFallbackSuggestions(results);
  } catch {
    return getFallbackSuggestions(results);
  }
}

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
 * Legacy function for backward compatibility (using LLM factory)
 */
export async function getLLMResponse(message: string): Promise<string> {
  try {
    const llmFactory = getLLMFactory();

    const response = await llmFactory.generate({
      messages: [
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      maxTokens: 500
    });

    return response.text;
  } catch (error) {
    console.error('[getLLMResponse] LLM API error:', error);
    return 'Sorry, I could not process your request.';
  }
}
