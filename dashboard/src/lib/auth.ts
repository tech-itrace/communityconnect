/**
 * Authentication utility functions for smart auth middleware integration
 */

export interface UserContext {
    phoneNumber: string;
    role?: string;
    name?: string;
}

/**
 * Get the current user's phone number
 */
export const getUserPhone = (): string | null => {
    // Try localStorage first (set after login)
    const storedPhone = localStorage.getItem('userPhone');
    if (storedPhone) return storedPhone;

    // Fall back to environment variable for testing
    const envPhone = import.meta.env.VITE_TEST_PHONE_NUMBER;
    if (envPhone) return envPhone;

    return null;
};

/**
 * Set user phone number in localStorage
 */
export const setUserPhone = (phoneNumber: string): void => {
    localStorage.setItem('userPhone', phoneNumber);
};

/**
 * Remove user phone number from localStorage
 */
export const clearUserPhone = (): void => {
    localStorage.removeItem('userPhone');
};

/**
 * Get user context from localStorage
 */
export const getUserContext = (): UserContext | null => {
    const phoneNumber = getUserPhone();
    if (!phoneNumber) return null;

    const role = localStorage.getItem('userRole');
    const name = localStorage.getItem('userName');

    return {
        phoneNumber,
        role: role || undefined,
        name: name || undefined
    };
};

/**
 * Set user context in localStorage
 */
export const setUserContext = (context: UserContext): void => {
    setUserPhone(context.phoneNumber);
    if (context.role) {
        localStorage.setItem('userRole', context.role);
    }
    if (context.name) {
        localStorage.setItem('userName', context.name);
    }
};

/**
 * Clear all user context from localStorage
 */
export const clearUserContext = (): void => {
    clearUserPhone();
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('token');
};

/**
 * Check if user is authenticated (has phone number)
 */
export const isAuthenticated = (): boolean => {
    return getUserPhone() !== null;
};

/**
 * Format phone number for display
 */
export const formatPhone = (phone: string): string => {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Format as: +91 98765 43210
    if (cleaned.length === 10) {
        return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
    }

    return phone;
};

/**
 * Normalize phone number (remove country code, formatting, etc.)
 */
export const normalizePhone = (phone: string): string => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Remove country code if present
    if (cleaned.startsWith('91') && cleaned.length === 12) {
        return cleaned.slice(2);
    }

    return cleaned;
};
