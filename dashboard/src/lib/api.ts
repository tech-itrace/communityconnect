import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export interface Member {
    id: number;
    phone_number: string;
    name: string;
    email?: string;
    location?: string;
    expertise?: string;
    interests?: string;
    availability?: string;
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
    getById: (id: number) => api.get<Member>(`/api/members/${id}`),
    create: (member: Partial<Member>) => api.post<Member>('/api/members', member),
    update: (id: number, member: Partial<Member>) =>
        api.put<Member>(`/api/members/${id}`, member),
    delete: (id: number) => api.delete(`/api/members/${id}`),
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
