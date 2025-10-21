// Shared types/interfaces for the application

// ============================================================================
// Database Models
// ============================================================================

export interface Member {
    id: string;
    name: string;
    yearOfGraduation: number | null;
    degree: string | null;
    branch: string | null;
    workingAs: string | null;
    organization: string | null;
    designation: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    skills: string | null;
    productsServices: string | null;
    annualTurnover: number | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface MemberEmbedding {
    id: string;
    memberId: string;
    profileEmbedding: number[];
    skillsEmbedding: number[];
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// Search Request Types
// ============================================================================

export interface SearchFilters {
    skills?: string[];
    services?: string[];
    city?: string;
    minTurnover?: number;
    maxTurnover?: number;
    yearOfGraduation?: number[];
    degree?: string[];
}

export interface SearchOptions {
    searchType?: 'hybrid' | 'semantic' | 'keyword';
    page?: number;
    limit?: number;
    sortBy?: 'relevance' | 'name' | 'turnover' | 'year';
    sortOrder?: 'asc' | 'desc';
}

export interface SearchParams {
    query?: string;
    filters?: SearchFilters;
    options?: SearchOptions;
}

// ============================================================================
// Search Result Types
// ============================================================================

export interface MemberSearchResult {
    id: string;
    name: string;
    email: string;
    phone: string;
    city: string;
    organization: string;
    designation: string;
    skills: string;
    productsServices: string;
    annualTurnover: number;
    yearOfGraduation: number;
    degree: string;
    branch: string;
    relevanceScore: number;
    matchedFields: string[];
}

export interface PaginationInfo {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    resultsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface SearchResponse {
    success: boolean;
    query?: string;
    searchType: string;
    results: {
        members: MemberSearchResult[];
        pagination: PaginationInfo;
        executionTime: number;
    };
}

// ============================================================================
// Member Service Types
// ============================================================================

export interface PaginatedMembers {
    members: Member[];
    pagination: PaginationInfo;
}

export interface MemberStats {
    totalMembers: number;
    activeMembers: number;
    uniqueCities: number;
    uniqueDegrees: number;
    averageTurnover: number;
    topSkills: Array<{ skill: string; count: number }>;
    topCities: Array<{ city: string; count: number }>;
}

// ============================================================================
// Internal Search Types
// ============================================================================

export interface ScoredMember extends Member {
    relevanceScore: number;
    semanticScore?: number;
    keywordScore?: number;
    matchedFields: string[];
}

export interface EmbeddingResult {
    embedding: number[];
    model: string;
    dimensions: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface SearchMembersRequest {
    query?: string;
    filters?: SearchFilters;
    searchType?: 'hybrid' | 'semantic' | 'keyword';
    page?: number;
    limit?: number;
    sortBy?: 'relevance' | 'name' | 'turnover' | 'year';
    sortOrder?: 'asc' | 'desc';
}

export interface GetMembersRequest {
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'turnover' | 'year';
    sortOrder?: 'asc' | 'desc';
    city?: string;
    degree?: string;
    yearOfGraduation?: number;
}

// ============================================================================
// Natural Language Processing Types
// ============================================================================

export interface ParsedQuery {
    intent: 'find_member' | 'get_info' | 'list_members' | 'compare';
    entities: ExtractedEntities;
    searchQuery: string;
    confidence: number;
}

export interface ExtractedEntities {
    skills?: string[];
    location?: string;
    services?: string[];
    turnoverRequirement?: 'high' | 'medium' | 'low';
    graduationYear?: number[];
    degree?: string;
}

export interface NLSearchRequest {
    query: string;
    phoneNumber: string;  // Required: user's mobile number for validation
    context?: {
        previousQuery?: string;
        previousResults?: string[];
    };
    options?: {
        includeResponse?: boolean;
        includeSuggestions?: boolean;
        maxResults?: number;
    };
}

export interface NLSearchResult {
    understanding: {
        intent: string;
        entities: ExtractedEntities;
        confidence: number;
        normalizedQuery: string;
    };
    results: {
        members: MemberSearchResult[];
        pagination: PaginationInfo;
    };
    response?: {
        conversational: string;
        suggestions?: string[];
    };
    executionTime: number;
}

export interface NLSearchResponse {
    success: boolean;
    query: string;
    understanding: {
        intent: string;
        entities: ExtractedEntities;
        confidence: number;
        normalizedQuery: string;
    };
    results: {
        members: MemberSearchResult[];
        pagination: PaginationInfo;
    };
    response?: {
        conversational: string;
        suggestions?: string[];
    };
    executionTime: number;
}

// ============================================================================
// Conversation History Types
// ============================================================================

export interface ConversationEntry {
    query: string;
    timestamp: number;
    intent: string;
    entities: ExtractedEntities;
    resultCount: number;
}

export interface ConversationSession {
    phoneNumber: string;
    memberName: string;
    history: ConversationEntry[];
    lastActivity: number;
}

// ============================================================================
// Session Management Types (Redis-based)
// ============================================================================

export interface WhatsAppSession {
    userId: string;
    phoneNumber: string;
    memberName: string;
    role: 'member' | 'admin' | 'super_admin';
    conversationHistory: ConversationEntry[];
    lastActivity: Date;
    messageCount: number;
    searchCount: number;
    createdAt: Date;
}

export interface SessionData {
    userId: string;
    phoneNumber: string;
    memberName: string;
    role: 'member' | 'admin' | 'super_admin';
}

export interface SessionUpdateData {
    lastMessage?: string;
    lastResponse?: string;
    messageCount?: number;
    searchCount?: number;
    conversationHistory?: ConversationEntry[];
}

// ============================================================================
// Error Types
// ============================================================================

export interface ApiError {
    code: string;
    message: string;
    details?: any;
}

export interface ApiErrorResponse {
    success: false;
    error: ApiError;
}
