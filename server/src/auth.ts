import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, TOKEN_TTL } from './config.js';

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function userIdFromToken(token: unknown): number | null {
  if (typeof token !== 'string' || !token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    const id = Number(payload.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const userId = userIdFromToken(token);
  if (!userId) {
    res.status(401).json({ error: 'Требуется авторизация' });
    return;
  }
  req.userId = userId;
  next();
}
