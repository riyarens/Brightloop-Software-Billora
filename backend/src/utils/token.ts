import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';

export interface JwtPayload {
  userId: string;
  role: string;
  customerId?: string;
  email: string;
}

export const signJwtToken = (payload: JwtPayload, options?: SignOptions): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: (options?.expiresIn || config.jwt.expiresIn) as any,
    ...options,
  });
};

export const verifyJwtToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
};

export const generateCryptoResetToken = (): { rawToken: string; hashedToken: string } => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, hashedToken };
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

