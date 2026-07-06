import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../config/tokenVerifier';

const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authorization header is missing or invalid' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = await verifyToken(token);
    req.user = decoded;
    next();
  } catch (error: any) {
    res.status(401).json({ message: 'Invalid or expired token', error: error.message });
  }
};

export default authMiddleware;
