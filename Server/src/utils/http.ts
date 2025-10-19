// HTTP helpers (e.g., error formatting)
export function formatError(error: any): string {
    return error?.message || 'Unknown error';
}
