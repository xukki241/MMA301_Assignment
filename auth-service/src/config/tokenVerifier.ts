import jwt from 'jsonwebtoken';
import User from '../models/User';
import UserRole from '../models/UserRole';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123!';

export interface TokenPayload {
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  if (!token) {
    throw new Error('Token is required');
  }

  // 1. Try local verification using JWT_SECRET
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (process.env.NODE_ENV === 'test' && decoded.userId === 'usr_mock123') {
      return {
        userId: decoded.userId,
        email: decoded.email,
        fullName: decoded.fullName,
        roles: decoded.roles || [],
      };
    }

    let user = null;
    if (decoded.userId) {
      user = await User.findById(decoded.userId);
    } else if (decoded.email) {
      user = await User.findOne({ email: decoded.email });
    }

    if (user) {
      if (user.isActive === false) {
        throw new Error('User is deactivated');
      }
      const userRoles = await UserRole.find({ userId: user._id }).populate({
        path: 'roleId',
        model: 'Role',
      });
      const roles = userRoles.map((ur: any) => ur.roleId.roleName);
      return {
        userId: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        roles,
      };
    }
  } catch (err) {
    // Fall through to Cognito token verification
  }

  // 2. Decode as Cognito JWT
  const decoded = jwt.decode(token) as any;
  if (!decoded) {
    throw new Error('Invalid token format');
  }

  const currentTime = Math.floor(Date.now() / 1000);
  if (decoded.exp && decoded.exp < currentTime) {
    throw new Error('Token has expired');
  }

  const sub = decoded.sub;
  const email = decoded.email || decoded.username;

  if (!sub && !email) {
    throw new Error('Token does not contain sub or email');
  }

  const query: any[] = [];
  if (sub) query.push({ cognitoSub: sub });
  if (email && email.includes('@')) query.push({ email: email.toLowerCase() });

  if (query.length === 0) throw new Error('Could not extract sub or email for query');

  const user = await User.findOne({ $or: query });
  if (!user) throw new Error('User not found in database');
  if (user.isActive === false) throw new Error('User is deactivated');

  const userRoles = await UserRole.find({ userId: user._id }).populate({
    path: 'roleId',
    model: 'Role',
  });
  const roles = userRoles.map((ur: any) => ur.roleId.roleName);

  return {
    userId: user._id.toString(),
    email: user.email,
    fullName: user.fullName,
    roles,
  };
}
