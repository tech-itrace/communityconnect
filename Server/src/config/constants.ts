/**
 * Application Constants
 *
 * Centralized configuration values to avoid magic numbers/strings
 */

// ============================================================================
// PAGINATION
// ============================================================================
export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
    MIN_PAGE: 1,
    MIN_LIMIT: 1
} as const;

// ============================================================================
// VALIDATION LIMITS
// ============================================================================
export const VALIDATION = {
    QUERY_MAX_LENGTH: 500,
    QUERY_MIN_LENGTH: 1,
    MAX_RESULTS_MIN: 1,
    MAX_RESULTS_MAX: 50,
    MAX_RESULTS_DEFAULT: 10,
    CONFIDENCE_THRESHOLD: 0.3,
    LOW_CONFIDENCE_THRESHOLD: 0.3,
    NAME_MAX_LENGTH: 255,
    NAME_MIN_LENGTH: 1,
    PHONE_LENGTH: 12,
    PHONE_PREFIX: '91',
    EMAIL_MAX_LENGTH: 255
} as const;

// ============================================================================
// REGEX PATTERNS
// ============================================================================
export const REGEX = {
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    PHONE_INDIAN: /^91\d{10}$/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
} as const;

// ============================================================================
// ERROR CODES
// ============================================================================
export const ERROR_CODES = {
    // Client errors (4xx)
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_ID: 'INVALID_ID',
    INVALID_QUERY: 'INVALID_QUERY',
    INVALID_PARAMETERS: 'INVALID_PARAMETERS',
    INVALID_MAX_RESULTS: 'INVALID_MAX_RESULTS',
    QUERY_TOO_LONG: 'QUERY_TOO_LONG',

    // Authentication/Authorization (401/403)
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    PHONE_NUMBER_REQUIRED: 'PHONE_NUMBER_REQUIRED',

    // Not Found (404)
    NOT_FOUND: 'NOT_FOUND',
    MEMBER_NOT_FOUND: 'MEMBER_NOT_FOUND',
    COMMUNITY_NOT_FOUND: 'COMMUNITY_NOT_FOUND',

    // Conflict (409)
    DUPLICATE_MEMBER: 'DUPLICATE_MEMBER',
    ALREADY_EXISTS: 'ALREADY_EXISTS',

    // Server errors (5xx)
    SERVER_ERROR: 'SERVER_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',

    // File/Import errors
    NO_FILE: 'NO_FILE',
    EMPTY_FILE: 'EMPTY_FILE',
    CSV_PARSE_ERROR: 'CSV_PARSE_ERROR'
} as const;

// ============================================================================
// HTTP STATUS CODES
// ============================================================================
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
} as const;

// ============================================================================
// SORT OPTIONS
// ============================================================================
export const SORT_FIELDS = {
    NAME: 'name',
    TURNOVER: 'turnover',
    YEAR: 'year',
    CREATED_AT: 'created_at'
} as const;

export const SORT_ORDERS = {
    ASC: 'asc',
    DESC: 'desc'
} as const;

// ============================================================================
// MEMBER TYPES
// ============================================================================
export const MEMBER_TYPES = {
    ALUMNI: 'alumni',
    ENTREPRENEUR: 'entrepreneur',
    RESIDENT: 'resident',
    GENERIC: 'generic'
} as const;

// ============================================================================
// ROLES
// ============================================================================
export const ROLES = {
    MEMBER: 'member',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin'
} as const;

// ============================================================================
// DATABASE
// ============================================================================
export const DB = {
    MAX_CONNECTIONS: 20,
    IDLE_TIMEOUT_MS: 30000,
    CONNECTION_TIMEOUT_MS: 5000,
    QUERY_TIMEOUT_MS: 10000
} as const;

// ============================================================================
// ANALYTICS
// ============================================================================
export const ANALYTICS = {
    DEFAULT_DAYS: 30,
    TOP_ITEMS_LIMIT: 50
} as const;

// ============================================================================
// CACHE/REDIS
// ============================================================================
export const CACHE = {
    DEFAULT_TTL: 3600, // 1 hour in seconds
    SESSION_TTL: 86400, // 24 hours
    SEARCH_CACHE_TTL: 1800, // 30 minutes
    EMBEDDING_CACHE_TTL: 604800 // 7 days
} as const;

// ============================================================================
// RATE LIMITING
// ============================================================================
export const RATE_LIMITS = {
    GLOBAL_PER_HOUR: 1000,
    MESSAGES_PER_HOUR: 50,
    SEARCHES_PER_HOUR: 30,
    WINDOW_MS: 3600000 // 1 hour in milliseconds
} as const;

// ============================================================================
// FILE UPLOAD
// ============================================================================
export const FILE_UPLOAD = {
    MAX_SIZE_MB: 5,
    MAX_SIZE_BYTES: 5 * 1024 * 1024,
    ALLOWED_MIME_TYPES: ['text/csv', 'application/vnd.ms-excel'],
    CSV_ENCODING: 'utf-8'
} as const;

// ============================================================================
// LLM CONFIGURATION
// ============================================================================
export const LLM = {
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
    TIMEOUT_MS: 30000,
    CIRCUIT_BREAKER_THRESHOLD: 5,
    CIRCUIT_BREAKER_RESET_MS: 60000,
    EMBEDDING_DIMENSIONS: 768
} as const;

// ============================================================================
// SEARCH
// ============================================================================
export const SEARCH = {
    DEFAULT_MAX_RESULTS: 10,
    MAX_RESULTS_LIMIT: 50,
    SEMANTIC_WEIGHT: 0.7,
    KEYWORD_WEIGHT: 0.3,
    MIN_SIMILARITY_SCORE: 0.5
} as const;

// ============================================================================
// LOGGING
// ============================================================================
export const LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
} as const;

// ============================================================================
// SUGGESTION ENGINE
// ============================================================================
export const SUGGESTIONS = {
    MAX_SUGGESTIONS: 5,
    MIN_CONFIDENCE_FOR_SUGGESTIONS: 0.5
} as const;

// Type exports for TypeScript
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
export type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];
export type SortField = typeof SORT_FIELDS[keyof typeof SORT_FIELDS];
export type SortOrder = typeof SORT_ORDERS[keyof typeof SORT_ORDERS];
export type MemberType = typeof MEMBER_TYPES[keyof typeof MEMBER_TYPES];
export type Role = typeof ROLES[keyof typeof ROLES];
