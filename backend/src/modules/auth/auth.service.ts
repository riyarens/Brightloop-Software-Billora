import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import prisma from '../../config/prisma';
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.validation';
import {
  ConflictError,
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
} from '../../utils/errors';
import {
  signJwtToken,
  generateCryptoResetToken,
  hashToken,
} from '../../utils/token';
import { sendPasswordResetEmail } from '../../utils/mailer';

export class AuthService {
  /**
   * Register a new Customer with a linked User record in a single transaction
   */
  async registerCustomer(input: RegisterInput) {
    const email = input.email.toLowerCase().trim();

    // Check unique email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError('An account with this email already exists');
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { email },
    });

    if (existingCustomer) {
      throw new ConflictError('A customer record with this email already exists');
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(input.password, 10);
    const displayName =
      input.name ||
      [input.firstName, input.lastName].filter(Boolean).join(' ') ||
      email.split('@')[0];

    // Atomically create User and Customer records
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
          role: Role.CUSTOMER,
          isActive: true,
        },
      });

      const customer = await tx.customer.create({
        data: {
          userId: user.id,
          name: displayName,
          email,
          phone: input.phone,
          company: input.company,
          isActive: true,
        },
      });

      return { user, customer };
    });

    // Generate JWT token
    const token = signJwtToken({
      userId: result.user.id,
      role: result.user.role,
      customerId: result.customer.id,
      email: result.user.email,
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        createdAt: result.user.createdAt,
      },
      customer: {
        id: result.customer.id,
        name: result.customer.name,
        email: result.customer.email,
        company: result.customer.company,
        phone: result.customer.phone,
      },
      token,
    };
  }

  /**
   * Verify credentials and generate JWT
   */
  async login(input: LoginInput) {
    const email = input.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        customer: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User account is deactivated. Please contact support.');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = signJwtToken({
      userId: user.id,
      role: user.role,
      customerId: user.customer?.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      customer: user.customer
        ? {
            id: user.customer.id,
            name: user.customer.name,
            email: user.customer.email,
            company: user.customer.company,
          }
        : null,
      token,
    };
  }

  /**
   * Get current authenticated user profile
   */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
            address: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
            taxId: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    return user;
  }

  /**
   * Dispatches a cryptographically secure reset token with 30-minute expiry
   * Does not reveal if the email exists
   */
  async forgotPassword(input: ForgotPasswordInput) {
    const email = input.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user && user.isActive) {
      const { rawToken, hashedToken } = generateCryptoResetToken();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: hashedToken,
          resetPasswordExpires: expiresAt,
        },
      });

      // Send reset email asynchronously
      await sendPasswordResetEmail(user.email, rawToken);
    }

    return {
      message: 'If this email is registered, a password reset link has been dispatched.',
    };
  }

  /**
   * Verifies hashed token, checks 30-minute expiry, and updates password
   */
  async resetPassword(input: ResetPasswordInput) {
    const hashedToken = hashToken(input.token);

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired password reset token');
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return {
      message: 'Password reset successfully. You can now log in with your new password.',
    };
  }
}

export const authService = new AuthService();
export default authService;

