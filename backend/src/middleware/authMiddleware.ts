import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extends Express's Request type so TypeScript knows req.user might exist
// after this middleware runs — without this, TS would complain that
// "user" isn't a known property on Request.
export interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string };
}

export function verifyToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  // Tokens are sent as "Authorization: Bearer <token>" — a standard convention.
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as { id: string; role: string };
    req.user = decoded; // attach the decoded payload so later code knows who's calling
    next(); // move on to the actual route handler
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// A second layer — checks not just "is this person logged in" but
// "are they specifically an admin". Reusable for doctor-only or
// patient-only routes later too, just by changing the expected role.
export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }
    next();
  };
}