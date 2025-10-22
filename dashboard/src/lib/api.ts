import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Get user phone number from localStorage or environment
 * Used for smart auth middleware integration
 */
const getUserPhone = (): string | null => {
    // Try localStorage first (set after login)
    const storedPhone = localStorage.getItem('userPhone');
    if (storedPhone) return storedPhone;
    
    // Fall back to environment variable for testing
    const envPhone = import.meta.env.VITE_TEST_PHONE_NUMBER;
    if (envPhone) return envPhone;
    
    return null;
};

// Add phone number to all requests for smart auth middleware
api.interceptors.request.use((config) => {
    const phoneNumber = getUserPhone();
    
    if (phoneNumber) {
        // Add to query params for GET/DELETE requests
        if (config.method === 'get' || config.method === 'delete') {
            config.params = {
                ...config.params,
                phoneNumber
            };
        }
        
        // Add to body for POST/PUT/PATCH requests
        if (config.method === 'post' || config.method === 'put' || config.method === 'patch') {
            if (config.data) {
                config.data = {
                    ...config.data,
                    phoneNumber
                };
            } else {
                config.data = { phoneNumber };
            }
        }
    }
    
    // Still support legacy token-based auth if present
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
});

// Handle auth and authorization errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Unauthorized - no valid user/phone
            console.error('Authentication failed:', error.response.data);
            localStorage.removeItem('token');
            localStorage.removeItem('userPhone');
            
            // Don't redirect if on login page
            if (!window.location.pathname.includes('/login')) {
                // For now, just log - will implement login page in Week 4
                console.warn('Please set phone number for testing. Use: localStorage.setItem("userPhone", "9876543210")');
            }
        } else if (error.response?.status === 403) {
            // Forbidden - user doesn't have required role/permission
            const errorData = error.response.data?.error;
            console.error('Access denied:', {
                message: errorData?.message,
                userRole: errorData?.userRole,
                requiredRoles: errorData?.allowedRoles || errorData?.requiredPermission
            });
        }
        return Promise.reject(error);
    }
);

export interface Member {
    id: string;
    phone: string;
    name: string;
    email?: string;
    city?: string;
    working_knowledge?: string;
    degree?: string;
    branch?: string;
    organization_name?: string;
    designation?: string;
    role?: string;
    created_at?: string;
    updated_at?: string;
}

export interface AnalyticsData {
    totalMembers: number;
    totalSearches: number;
    activeUsers: number;
    avgResponseTime: number;
    searchesByDay: Array<{ date: string; count: number }>;
    topQueries: Array<{ query: string; count: number }>;
    memberActivity: Array<{ name: string; searches: number }>;
}

export interface SearchLog {
    id: number;
    phone_number: string;
    query: string;
    results_count: number;
    created_at: string;
}

// API Functions
export const memberAPI = {
    getAll: () => api.get<Member[]>('/api/members'),
    getById: (id: string) => api.get<Member>(`/api/members/${id}`),
    create: (member: Partial<Member>) => api.post<Member>('/api/members', member),
    update: (id: string, member: Partial<Member>) =>
        api.put<Member>(`/api/members/${id}`, member),
    delete: (id: string) => api.delete(`/api/members/${id}`),
};

export const analyticsAPI = {
    getOverview: () => api.get<AnalyticsData>('/api/analytics/overview'),
    getSearchLogs: (limit = 100) =>
        api.get<SearchLog[]>(`/api/analytics/searches?limit=${limit}`),
};

export const authAPI = {
    login: (phoneNumber: string) =>
        api.post<{ token: string }>('/api/auth/login', { phoneNumber }),
    verifyOTP: (phoneNumber: string, otp: string) =>
        api.post<{ token: string; user: Member }>('/api/auth/verify', {
            phoneNumber,
            otp
        }),
};
