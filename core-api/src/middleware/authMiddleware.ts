import { Request, Response, NextFunction } from 'express';
import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const PROTO_PATH = path.resolve(__dirname, '../../../proto/auth.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const authProto: any = grpc.loadPackageDefinition(packageDefinition).auth;
const grpcHost = process.env.AUTH_SERVICE_GRPC_HOST || 'localhost:50051';

const client = new authProto.AuthService(grpcHost, grpc.credentials.createInsecure());

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ message: 'Authorization header is missing' });
    return;
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  client.ValidateToken({ token }, (err: any, response: any) => {
    if (err) {
      console.error('gRPC ValidateToken validation error:', err);
      res.status(401).json({ message: 'Authentication service unavailable' });
      return;
    }
    if (!response || !response.isValid) {
      res.status(401).json({ message: 'Invalid or expired token' });
      return;
    }

    req.user = {
      userId: response.userId,
      email: response.email,
      fullName: response.fullName,
      roles: response.roles || [],
    };

    next();
  });
};

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
      return;
    }
    next();
  };
};
