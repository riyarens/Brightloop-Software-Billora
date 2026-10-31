import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import prisma from '../config/prisma';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { verifyJwtToken } from '../utils/token';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token missing');
    }

    const payload = verifyJwtToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { customer: { select: { id: true } } },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account not found or deactivated');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      customerId: user.customer?.id,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Forbidden access: insufficient permissions'));
    }

    next();
  };
};

export const checkCustomerOwnership = (paramKey = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Admins and Staff can access any customer's data
    if (req.user.role === Role.ADMIN || req.user.role === Role.STAFF) {
      return next();
    }

    // Customer can only access their own customer record
    const paramVal = req.params[paramKey];
    const targetCustomerId = Array.isArray(paramVal) ? paramVal[0] : paramVal;
    if (req.user.role === Role.CUSTOMER) {
      if (!req.user.customerId || req.user.customerId !== targetCustomerId) {
        return next(new ForbiddenError('Forbidden: You can only access your own customer records'));
      }
    }

    next();
  };
};
