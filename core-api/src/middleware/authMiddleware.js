const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.resolve(__dirname, '../../../proto/auth.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const authProto = grpc.loadPackageDefinition(packageDefinition).auth;
const grpcHost = process.env.AUTH_SERVICE_GRPC_HOST || 'localhost:50051';

const client = new authProto.AuthService(
  grpcHost,
  grpc.credentials.createInsecure()
);

const verifyTokenMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header is missing' });
  }

  // Support both raw token and Bearer prefix
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  client.ValidateToken({ token }, (err, response) => {
    if (err) {
      console.error('gRPC ValidateToken validation error:', err);
      return res.status(401).json({ message: 'Authentication service unavailable' });
    }
    if (!response || !response.isValid) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Attach user payload to the request
    req.user = {
      userId: response.userId,
      email: response.email,
      fullName: response.fullName,
      roles: response.roles || []
    };
    
    next();
  });
};

// Role authorization helper middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

module.exports = {
  verifyToken: verifyTokenMiddleware,
  authorizeRoles
};
