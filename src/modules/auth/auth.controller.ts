import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { generateToken } from '../../middleware/auth.middleware';
import { toUserRole, UserRole, AuthScheme } from '../../common/enums';
import { prisma } from '../../common/prisma';
import { BadRequestError, UnauthorizedError, ConflictError, NotFoundError } from '../../common/errors';
import { hashPassword, verifyPassword } from '../../common/security';

const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required').trim(),
  password: z.string().min(1, 'Password is required'),
});

const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters long')
    .max(50, 'Username cannot exceed 50 characters')
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .max(100, 'Password cannot exceed 100 characters'),
});

export class AuthController {
  /**
   * User login: Verifies password against database salt:hash.
   * User role is strictly fetched from the database, never from client input.
   */
  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = LoginSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError('Validation error', parsed.error.errors);
      }

      const { username, password } = parsed.data;
      const user = await prisma.user.findUnique({
        where: { username: username.toLowerCase() },
      });

      if (!user) {
        throw new UnauthorizedError('Invalid username or password');
      }

      const isPasswordValid = await verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid username or password');
      }

      const role = toUserRole(user.role) || UserRole.VIEWER;
      const token = generateToken({
        userId: user.id,
        username: user.username,
        role,
      });

      res.status(200).json({
        status: 'success',
        message: 'Authentication successful',
        token,
        tokenType: AuthScheme.BEARER,
        user: {
          id: user.id,
          username: user.username,
          role,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User registration: Creates new user account in database with hashed password.
   * Role is assigned by system policy (defaults to CONTRIBUTOR, cannot be set by client).
   */
  public async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = RegisterSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError('Validation error', parsed.error.errors);
      }

      const { username, password } = parsed.data;
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        throw new ConflictError(`Username '${username}' is already registered`);
      }

      const passwordHash = await hashPassword(password);
      // System policy dictates role: standard registration gets CONTRIBUTOR role
      const assignedRole = UserRole.CONTRIBUTOR;

      const newUser = await prisma.user.create({
        data: {
          username,
          passwordHash,
          role: assignedRole,
        },
      });

      const token = generateToken({
        userId: newUser.id,
        username: newUser.username,
        role: assignedRole,
      });

      res.status(201).json({
        status: 'success',
        message: 'Account registered successfully',
        token,
        tokenType: AuthScheme.BEARER,
        user: {
          id: newUser.id,
          username: newUser.username,
          role: assignedRole,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User logout: Informs the client to discard the session token.
   */
  public async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully. Please remove your authorization token client-side.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Return the profile and role details of the currently authenticated identity, verified from database.
   */
  public async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new NotFoundError('User identity not found in database');
      }

      res.status(200).json({
        status: 'success',
        data: {
          authenticated: true,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
