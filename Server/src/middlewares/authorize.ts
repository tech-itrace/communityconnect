/**
 * Authorization Middleware
 * 
 * Handles role-based access control (RBAC):
 * - member: Basic search and view
 * - admin: Can add/edit members
 * - super_admin: Full access including delete
 */

import { Request, Response, NextFunction } from 'express';
import { Role, ROLE_PERMISSIONS } from '../utils/types';

// Extend Express Request to include user info
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                phoneNumber: string;
                memberName: string;
                role: Role;
            };
        }
    }
}

/**
 * Check if role has required permission
 */
export function hasPermission(role: Role, permission: keyof typeof ROLE_PERMISSIONS['member']): boolean {
    return ROLE_PERMISSIONS[role][permission];
}

/**
 * Require specific role (exact match)
 */
export function requireRole(requiredRole: Role) {
    return (req: Request, res: Response, next: NextFunction) => {
        // Get user from request (should be set by authentication middleware)
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required'
                }
            });
        }

        // Check if user has required role
        if (user.role !== requiredRole) {
            console.log(`[Authorize] Access denied: ${user.role} tried to access ${requiredRole}-only route`);
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: `Access denied. This action requires ${requiredRole} role.`,
                    userRole: user.role,
                    requiredRole
                }
            });
        }

        console.log(`[Authorize] ✓ Access granted: ${user.role} matches ${requiredRole}`);
        next();
    };
}

/**
 * Require any of the specified roles
 */
export function requireAnyRole(allowedRoles: Role[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required'
                }
            });
        }

        // Check if user has any of the allowed roles
        if (!allowedRoles.includes(user.role)) {
            console.log(`[Authorize] Access denied: ${user.role} not in [${allowedRoles.join(', ')}]`);
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: `Access denied. This action requires one of: ${allowedRoles.join(', ')}`,
                    userRole: user.role,
                    allowedRoles
                }
            });
        }

        console.log(`[Authorize] ✓ Access granted: ${user.role} in allowed roles`);
        next();
    };
}

/**
 * Require specific permission (uses permission matrix)
 */
export function requirePermission(permission: keyof typeof ROLE_PERMISSIONS['member']) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required'
                }
            });
        }

        // Check if user's role has the required permission
        if (!hasPermission(user.role, permission)) {
            console.log(`[Authorize] Access denied: ${user.role} lacks permission '${permission}'`);
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: `Access denied. You don't have permission to ${permission}`,
                    userRole: user.role,
                    requiredPermission: permission
                }
            });
        }

        console.log(`[Authorize] ✓ Access granted: ${user.role} has permission '${permission}'`);
        next();
    };
}

/**
 * Check if user owns the resource (for self-update operations)
 */
export function requireOwnership(getResourceOwnerId: (req: Request) => string) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required'
                }
            });
        }

        const resourceOwnerId = getResourceOwnerId(req);

        // Super admins can access anything
        if (user.role === 'super_admin') {
            console.log(`[Authorize] ✓ Super admin bypass for resource ${resourceOwnerId}`);
            return next();
        }

        // Admins can access any resource
        if (user.role === 'admin') {
            console.log(`[Authorize] ✓ Admin bypass for resource ${resourceOwnerId}`);
            return next();
        }

        // Regular members can only access their own resources
        if (user.userId !== resourceOwnerId) {
            console.log(`[Authorize] Access denied: User ${user.userId} tried to access resource ${resourceOwnerId}`);
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You can only access your own resources'
                }
            });
        }

        console.log(`[Authorize] ✓ Ownership verified for user ${user.userId}`);
        next();
    };
}

/**
 * Middleware to set user info from session (for WhatsApp)
 * This should be used before authorization middlewares
 */
export async function setUserFromSession(req: Request, res: Response, next: NextFunction) {
    try {
        // For WhatsApp webhook
        if (req.body.From) {
            const phoneNumber = req.body.From.replace('whatsapp:+', '');
            
            // Get user from session (simplified - in production would query DB)
            // For now, we'll check if there's a session in Redis via sessionService
            const { getSession } = await import('../services/sessionService');
            const session = await getSession(phoneNumber);

            if (session) {
                req.user = {
                    userId: session.userId,
                    phoneNumber: session.phoneNumber,
                    memberName: session.memberName,
                    role: session.role
                };
                console.log(`[Authorize] ✓ User set from session: ${session.memberName} (${session.role})`);
            }
        }

        // For API requests with phoneNumber in body/query
        if (!req.user && (req.body.phoneNumber || req.query.phoneNumber)) {
            const phoneNumber = req.body.phoneNumber || req.query.phoneNumber;
            
            const { getSession } = await import('../services/sessionService');
            const session = await getSession(phoneNumber);

            if (session) {
                req.user = {
                    userId: session.userId,
                    phoneNumber: session.phoneNumber,
                    memberName: session.memberName,
                    role: session.role
                };
                console.log(`[Authorize] ✓ User set from session: ${session.memberName} (${session.role})`);
            }
        }

        next();
    } catch (error) {
        console.error('[Authorize] Error setting user from session:', error);
        next(); // Continue even if setting user fails
    }
}
