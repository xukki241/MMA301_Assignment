import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import User from '../models/User';
import UserRole from '../models/UserRole';
import { verifyToken } from '../config/tokenVerifier';

const PROTO_PATH = path.resolve(__dirname, '../../../proto/auth.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const authProto: any = grpc.loadPackageDefinition(packageDefinition).auth;

const validateToken = async (call: any, callback: any): Promise<void> => {
  try {
    let token: string = call.request.token || '';
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

const getUser = async (call: any, callback: any): Promise<void> => {
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
    const roles = userRoles.map((ur: any) => ur.roleId.roleName);

    callback(null, {
      userId: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarURL || '',
      role: roles[0] || 'Student',
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error('gRPC GetUser error:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
};

export const startGrpcServer = (port: string | number = '50051'): grpc.Server => {
  const server = new grpc.Server();
  server.addService(authProto.AuthService.service, {
    ValidateToken: validateToken,
    GetUser: getUser,
  });

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err: Error | null, bindPort: number) => {
      if (err) {
        console.error(`gRPC server bind failed: ${err.message}`);
        return;
      }
      console.log(`gRPC server running at http://0.0.0.0:${bindPort}`);
    }
  );

  return server;
};

export { validateToken, getUser };
