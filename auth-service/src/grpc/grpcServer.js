const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserRole = require('../models/UserRole');

const { verifyToken } = require('../config/tokenVerifier');
const PROTO_PATH = path.resolve(__dirname, '../../../proto/auth.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const authProto = grpc.loadPackageDefinition(packageDefinition).auth;

// Validate JWT Token (with fallback for Bearer prefix)
const validateToken = async (call, callback) => {
  try {
    let token = call.request.token || '';
    if (token.startsWith('Bearer ')) {
      token = token.substring(7);
    }

    const decoded = await verifyToken(token);
    callback(null, {
      isValid: true,
      userId: decoded.userId || '',
      email: decoded.email || '',
      fullName: decoded.fullName || '',
      roles: decoded.roles || [],
    });
  } catch (error) {
    callback(null, {
      isValid: false,
      userId: '',
      email: '',
      fullName: '',
      roles: [],
    });
  }
};

// Fetch profile details for a given userId
const getUser = async (call, callback) => {
  try {
    const { userId } = call.request;
    if (!userId) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'userId is required',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: 'User not found',
      });
    }

    const userRoles = await UserRole.find({ userId: user._id }).populate({
      path: 'roleId',
      model: 'Role',
    });
    const roles = userRoles.map((ur) => ur.roleId.roleName);

    callback(null, {
      userId: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarURL || '',
      role: roles[0] || 'Student',
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('gRPC GetUser error:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
};

const startGrpcServer = (port = '50051') => {
  const server = new grpc.Server();
  server.addService(authProto.AuthService.service, {
    ValidateToken: validateToken,
    GetUser: getUser,
  });

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, bindPort) => {
      if (err) {
        console.error(`gRPC server bind failed: ${err.message}`);
        return;
      }
      console.log(`gRPC server running at http://0.0.0.0:${bindPort}`);
    }
  );

  return server;
};

module.exports = { startGrpcServer, validateToken, getUser };
