/**
 * JWT token utilities
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from './config.js';
import { logger } from './logger.js';

interface TokenPayload {
  userId: string | number;
  email?: string;
  iat?: number;
  exp?: number;
}

export interface DecodeTokenResult {
  payload: TokenPayload | null;
  error?: 'expired' | 'invalid' | 'unknown';
}

/**
 * Encode JWT token using proper jsonwebtoken library
 */
export function encodeToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  try {
    const options: SignOptions = {
      expiresIn: config.jwt.expiresIn as `${number}${'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y'}` | number,
    };
    return jwt.sign(payload, config.jwt.secret, options);
  } catch (error) {
    logger.error('Failed to encode JWT token', error);
    throw new Error('Token encoding failed');
  }
}

/**
 * Decode and verify JWT token using proper jsonwebtoken library
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('JWT token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT token', { error: error.message });
    } else {
      logger.error('JWT verification failed', error);
    }
    return null;
  }
}

/**
 * Decode and verify JWT token with detailed error information
 * Używane przez WebSocket do rozróżnienia typu błędu
 */
export function decodeTokenWithError(token: string): DecodeTokenResult {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
    return { payload: decoded };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('JWT token expired');
      return { payload: null, error: 'expired' };
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT token', { error: error.message });
      return { payload: null, error: 'invalid' };
    } else {
      logger.error('JWT verification failed', error);
      return { payload: null, error: 'unknown' };
    }
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}
