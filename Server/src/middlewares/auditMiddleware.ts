/**
 * Audit Middleware
 * 
 * Automatically logs admin actions, permission denials,
 * and important system events
 */

import { Request, Response, NextFunction } from 'express';
import { logAction, logPermissionDenial } from '../services/auditService';

/**
 * Extract IP address from request
 */
function getIpAddress(req: Request): string {
    return (
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.socket.remoteAddress ||
        'unknown'
    );
}

/**
 * Audit middleware for logging all admin actions
 * Should be placed after authentication middleware
 */
export function auditAdminActions(req: Request, res: Response, next: NextFunction) {
    // Only audit state-changing operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return next();
    }

    // Skip if no user (unauthenticated request)
    if (!req.user) {
        return next();
    }

    const originalSend = res.json;
    const startTime = Date.now();

    // Intercept response to log the outcome
    res.json = function (data: any) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        const success = statusCode >= 200 && statusCode < 300;

        // Determine action from route and method
        const action = determineAction(req.method, req.path);

        // Log the action (req.user is guaranteed to exist at this point)
        if (req.user) {
            logAction({
                phone: req.user.phoneNumber,
                userName: req.user.memberName,
                userRole: req.user.role,
                action,
                resourceType: determineResourceType(req.path),
                resourceId: req.params.id || req.body?.phone,
                newValue: success ? req.body : undefined,
                ipAddress: getIpAddress(req),
                userAgent: req.headers['user-agent'],
                status: success ? 'success' : 'failure',
                errorMessage: !success ? data?.error?.message : undefined,
                metadata: {
                    method: req.method,
                    path: req.path,
                    statusCode,
                    duration,
                    query: req.query
                }
            }).catch(err => {
                console.error('[Audit Middleware] Failed to log:', err);
            });
        }

        return originalSend.call(this, data);
    };

    next();
}

/**
 * Audit middleware specifically for permission denials
 * Should be used in error handler
 */
export function auditPermissionDenial(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) {
    // Only log 403 errors (permission denied)
    if (err.status === 403 && req.user) {
        logPermissionDenial(
            req.user.phoneNumber,
            req.user.memberName,
            req.user.role,
            determineAction(req.method, req.path),
            determineResourceType(req.path),
            err.message,
            getIpAddress(req)
        ).catch(err => {
            console.error('[Audit Middleware] Failed to log permission denial:', err);
        });
    }

    next(err);
}

/**
 * Determine action name from HTTP method and path
 */
function determineAction(method: string, path: string): string {
    // Remove leading /api/ prefix
    const cleanPath = path.replace(/^\/api\//, '');

    // Admin routes
    if (cleanPath.startsWith('admin/')) {
        if (cleanPath.includes('promote')) return 'admin.promote';
        if (cleanPath.includes('demote')) return 'admin.demote';
        return `admin.${method.toLowerCase()}`;
    }

    // Member routes
    if (cleanPath.startsWith('members')) {
        switch (method) {
            case 'POST': return 'member.create';
            case 'PUT':
            case 'PATCH': return 'member.update';
            case 'DELETE': return 'member.delete';
            default: return 'member.access';
        }
    }

    // Search routes
    if (cleanPath.startsWith('search')) {
        if (cleanPath.includes('query')) return 'search.query';
        if (cleanPath.includes('members')) return 'search.members';
        return 'search.access';
    }

    // Analytics routes
    if (cleanPath.startsWith('analytics')) {
        return 'analytics.view';
    }

    // Generic action
    return `${method.toLowerCase()}.${cleanPath.split('/')[0]}`;
}

/**
 * Determine resource type from path
 */
function determineResourceType(path: string): string {
    const cleanPath = path.replace(/^\/api\//, '');
    const firstSegment = cleanPath.split('/')[0];

    const resourceMap: { [key: string]: string } = {
        'admin': 'admin',
        'members': 'member',
        'search': 'search',
        'analytics': 'analytics',
        'bot': 'bot',
        'whatsapp': 'whatsapp'
    };

    return resourceMap[firstSegment] || firstSegment;
}

/**
 * Audit middleware for successful actions (non-intercepting)
 */
export function auditSuccess(
    action: string,
    resourceType?: string
) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.user) {
            logAction({
                phone: req.user.phoneNumber,
                userName: req.user.memberName,
                userRole: req.user.role,
                action,
                resourceType,
                resourceId: req.params.id,
                ipAddress: getIpAddress(req),
                userAgent: req.headers['user-agent'],
                status: 'success'
            }).catch(err => {
                console.error('[Audit] Failed to log success:', err);
            });
        }
        next();
    };
}
