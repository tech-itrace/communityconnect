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
 * Intelligently validates role from database if not present in request
 */
export function requireRole(requiredRole: Role) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            let user = req.user;

            // If no user object exists, try to get phone number from request
            if (!user) {
                const phoneNumber = req.body.phoneNumber || req.query.phoneNumber || req.body.From?.replace('whatsapp:+', '');
                
                if (!phoneNumber) {
                    return res.status(401).json({
                        success: false,
                        error: {
                            code: 'UNAUTHORIZED',
                            message: 'Authentication required: No user or phone number provided'
                        }
                    });
                }

                // Fetch member from database
                const { getMemberByPhone } = await import('../services/memberService');
                const member = await getMemberByPhone(phoneNumber);

                if (!member) {
                    return res.status(401).json({
                        success: false,
                        error: {
                            code: 'UNAUTHORIZED',
                            message: 'User not found in database'
                        }
                    });
                }

                // Set user object from database
                user = {
                    userId: member.id,
                    phoneNumber: member.phone || phoneNumber,
                    memberName: member.name,
                    role: member.role || 'member' // Default to 'member' if no role in DB
                };

                // Attach user to request for subsequent middlewares
                req.user = user;
                console.log(`[Authorize] ✓ User loaded from DB: ${user.memberName} (${user.role})`);
            } else if (!user.role) {
                // User object exists but no role - fetch from database
                const { getMemberByPhone } = await import('../services/memberService');
                const member = await getMemberByPhone(user.phoneNumber);

                if (member && member.role) {
                    user.role = member.role;
                    if (req.user) {
                        req.user.role = member.role;
                    }
                    console.log(`[Authorize] ✓ Role updated from DB: ${user.role}`);
                } else {
                    // Default to 'member' if still no role
                    user.role = 'member';
                    if (req.user) {
                        req.user.role = 'member';
                    }
                    console.log(`[Authorize] ⚠ No role in DB, defaulting to 'member'`);
                }
            }

            // At this point, user must be defined
            if (!user) {
                return res.status(500).json({
                    success: false,
                    error: {
                        code: 'INTERNAL_ERROR',
                        message: 'Failed to establish user context'
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
        } catch (error) {
            console.error('[Authorize] Error in requireRole:', error);
            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Error validating user role'
                }
            });
        }
    };
}

/**
 * Require any of the specified roles
 * Intelligently validates role from database if not present in request
 */
export function requireAnyRole(allowedRoles: Role[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            let user = req.user;

            // If no user object exists, try to get phone number from request
            if (!user) {
                const phoneNumber = req.body.phoneNumber || req.query.phoneNumber || req.body.From?.replace('whatsapp:+', '');
                
                if (!phoneNumber) {
                    return res.status(401).json({
                        success: false,
                        error: {
                            code: 'UNAUTHORIZED',
                            message: 'Authentication required: No user or phone number provided'
                        }
                    });
                }

                // Fetch member from database
                const { getMemberByPhone } = await import('../services/memberService');
                const member = await getMemberByPhone(phoneNumber);

                if (!member) {
                    return res.status(401).json({
                        success: false,
                        error: {
                            code: 'UNAUTHORIZED',
                            message: 'User not found in database'
                        }
                    });
                }

                // Set user object from database
                user = {
                    userId: member.id,
                    phoneNumber: member.phone || phoneNumber,
                    memberName: member.name,
                    role: member.role || 'member' // Default to 'member' if no role in DB
                };

                // Attach user to request for subsequent middlewares
                req.user = user;
                console.log(`[Authorize] ✓ User loaded from DB: ${user.memberName} (${user.role})`);
            } else if (!user.role) {
                // User object exists but no role - fetch from database
                const { getMemberByPhone } = await import('../services/memberService');
                const member = await getMemberByPhone(user.phoneNumber);

                if (member && member.role) {
                    user.role = member.role;
                    if (req.user) {
                        req.user.role = member.role;
                    }
                    console.log(`[Authorize] ✓ Role updated from DB: ${user.role}`);
                } else {
                    // Default to 'member' if still no role
                    user.role = 'member';
                    if (req.user) {
                        req.user.role = 'member';
                    }
                    console.log(`[Authorize] ⚠ No role in DB, defaulting to 'member'`);
                }
            }

            // At this point, user must be defined
            if (!user) {
                return res.status(500).json({
                    success: false,
                    error: {
                        code: 'INTERNAL_ERROR',
                        message: 'Failed to establish user context'
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
        } catch (error) {
            console.error('[Authorize] Error in requireAnyRole:', error);
            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Error validating user role'
                }
            });
        }
    };
}

/**
 * Require specific permission (uses permission matrix)
 * Intelligently validates role from database if not present in request
 */
export function requirePermission(permission: keyof typeof ROLE_PERMISSIONS['member']) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            let user = req.user;

            // If no user object exists, try to get phone number from request
            if (!user) {
                const phoneNumber = req.body.phoneNumber || req.query.phoneNumber || req.body.From?.replace('whatsapp:+', '');
                
                if (!phoneNumber) {
                    return res.status(401).json({
                        success: false,
                        error: {
                            code: 'UNAUTHORIZED',
                            message: 'Authentication required: No user or phone number provided'
                        }
                    });
                }

                // Fetch member from database
                const { getMemberByPhone } = await import('../services/memberService');
                const member = await getMemberByPhone(phoneNumber);

                if (!member) {
                    return res.status(401).json({
                        success: false,
                        error: {
                            code: 'UNAUTHORIZED',
                            message: 'User not found in database'
                        }
                    });
                }

                // Set user object from database
                user = {
                    userId: member.id,
                    phoneNumber: member.phone || phoneNumber,
                    memberName: member.name,
                    role: member.role || 'member' // Default to 'member' if no role in DB
                };

                // Attach user to request for subsequent middlewares
                req.user = user;
                console.log(`[Authorize] ✓ User loaded from DB: ${user.memberName} (${user.role})`);
            } else if (!user.role) {
                // User object exists but no role - fetch from database
                const { getMemberByPhone } = await import('../services/memberService');
                const member = await getMemberByPhone(user.phoneNumber);

                if (member && member.role) {
                    user.role = member.role;
                    if (req.user) {
                        req.user.role = member.role;
                    }
                    console.log(`[Authorize] ✓ Role updated from DB: ${user.role}`);
                } else {
                    // Default to 'member' if still no role
                    user.role = 'member';
                    if (req.user) {
                        req.user.role = 'member';
                    }
                    console.log(`[Authorize] ⚠ No role in DB, defaulting to 'member'`);
                }
            }

            // At this point, user must be defined
            if (!user) {
                return res.status(500).json({
                    success: false,
                    error: {
                        code: 'INTERNAL_ERROR',
                        message: 'Failed to establish user context'
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
        } catch (error) {
            console.error('[Authorize] Error in requirePermission:', error);
            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Error validating user permission'
                }
            });
        }
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
