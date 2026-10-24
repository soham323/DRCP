import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError, ForbiddenError } from '../common/errors';
import { logger } from '../common/logger';
import { prisma } from '../common/prisma';
import {
  UserRole,
  HttpHeader,
  AuthScheme,
  toUserRole,
} from '../common/enums';

// Re-export UserRole for external module convenience
export { UserRole };

export interface AuthenticatedUser {
  userId: string;
  username: string;
  role: UserRole;
}

// Extend Express Request declaration to include strongly-typed user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const AUTH_CONFIG = {
  TOKEN_EXPIRY: '24h',
  BEARER_PREFIX: `${AuthScheme.BEARER} `,
} as const;

/**
 * Helper to generate a cryptographically signed JWT token embedding the database-verified user identity and role.
 */
export function generateToken(payload: { userId: string; username: string; role: UserRole }): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: AUTH_CONFIG.TOKEN_EXPIRY });
}

/**
 * Resolves user identity from cryptographic JWT Bearer token or validated database API key.
 * The user's role is strictly determined by the server/database, never by client-supplied role headers.
 */
export async function resolveUserFromRequest(req: Request): Promise<AuthenticatedUser | null> {
  // 1. Authorization Bearer token evaluation (Standard secure JWT)
  const authHeaderValue = req.header(HttpHeader.AUTHORIZATION);
  if (authHeaderValue) {
    if (!authHeaderValue.startsWith(AUTH_CONFIG.BEARER_PREFIX)) {
      throw new UnauthorizedError(`Authorization header must use the ${AuthScheme.BEARER} scheme`);
    }

    const token = authHeaderValue.substring(AUTH_CONFIG.BEARER_PREFIX.length).trim();
    if (!token) {
      throw new UnauthorizedError(`${AuthScheme.BEARER} token cannot be empty`);
    }

    // Cryptographic JWT signature verification
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      const role = toUserRole(decoded.role);
      if (!role) {
        throw new UnauthorizedError('Token contains an invalid authorization role');
      }

      return {
        userId: decoded.userId || decoded.sub,
        username: decoded.username,
        role,
      };
    } catch (err: any) {
      logger.warn(`[Auth] JWT verification failed: ${err.message}`);
      throw new UnauthorizedError(`Invalid or expired authentication token: ${err.message}`);
    }
  }

  // 2. Database-backed API Key verification (for machine-to-machine integrations)
  const apiKeyHeaderValue = req.header(HttpHeader.X_API_KEY);
  if (apiKeyHeaderValue) {
    const user = await prisma.user.findUnique({
      where: { apiKey: apiKeyHeaderValue },
    });

    if (!user) {
      throw new UnauthorizedError(`Invalid API Key provided via ${HttpHeader.X_API_KEY}`);
    }

    const role = toUserRole(user.role);
    if (!role) {
      throw new UnauthorizedError(`Database record for user '${user.username}' has an invalid role`);
    }

    return {
      userId: user.id,
      username: user.username,
      role,
    };
  }

  return null;
}

/**
 * Optional authentication middleware:
 * Populates req.user if valid credentials are provided, but allows unauthenticated callers to pass through.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await resolveUserFromRequest(req);
    if (user) {
      req.user = user;
    }
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Mandatory authentication middleware:
 * Enforces valid credentials. Throws HTTP 401 Unauthorized if absent or invalid.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await resolveUserFromRequest(req);
    if (!user) {
      throw new UnauthorizedError(
        `Authentication required. Provide a valid Authorization ${AuthScheme.BEARER} token or ${HttpHeader.X_API_KEY}.`
      );
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Role-Based Access Control (RBAC) guard:
 * Verifies that the caller's database-assigned role is included in the allowed UserRole set.
 * Throws HTTP 401 if unauthenticated, or HTTP 403 Forbidden if permission is denied.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        const user = await resolveUserFromRequest(req);
        if (!user) {
          throw new UnauthorizedError('Authentication required to access this resource.');
        }
        req.user = user;
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn(
          `[RBAC] Access denied for user '${req.user.username}' (role: ${req.user.role}) - Required: [${allowedRoles.join(', ')}]`
        );
        throw new ForbiddenError(
          `Role '${req.user.role}' is not permitted to perform this action. Required: [${allowedRoles.join(', ')}]`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
