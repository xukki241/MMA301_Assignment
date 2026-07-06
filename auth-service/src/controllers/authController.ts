import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  InitiateAuthCommand,
  SignUpCommand,
  AdminConfirmSignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient, getCognitoParams } from '../config/cognito';
import User from '../models/User';
import Role from '../models/Role';
import UserRole from '../models/UserRole';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123!';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const generateAccessToken = (user: any, roles: string[]): string => {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email, fullName: user.fullName, roles },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as any
  );
};

const generateRefreshToken = (user: any): string => {
  return jwt.sign({ userId: user._id.toString() }, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  } as any);
};

// POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, fullName, role = 'Student' } = req.body;

    if (!email || !password || !fullName) {
      res.status(400).json({ message: 'Email, password, and fullName are required' });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({ message: 'User with this email already exists' });
      return;
    }

    // Register in Cognito
    let cognitoSub = '';
    try {
      const { userPoolId, clientId } = await getCognitoParams();
      const signUpRes = await cognitoClient.send(
        new SignUpCommand({
          ClientId: clientId,
          Username: email.toLowerCase(),
          Password: password,
          UserAttributes: [
            { Name: 'email', Value: email.toLowerCase() },
            { Name: 'name', Value: fullName },
          ],
        })
      );
      cognitoSub = signUpRes.UserSub || '';
      await cognitoClient.send(
        new AdminConfirmSignUpCommand({ UserPoolId: userPoolId, Username: email.toLowerCase() })
      );
    } catch (cognitoError: any) {
      console.error('Cognito registration error:', cognitoError);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      cognitoSub,
    });

    let roleDoc = await Role.findOne({ roleName: role });
    if (!roleDoc) {
      roleDoc = await Role.create({ roleName: role });
    }

    await UserRole.create({ userId: newUser._id, roleId: roleDoc._id });

    res.status(201).json({
      message: 'User registered successfully',
      userId: newUser._id.toString(),
      email: newUser.email,
      fullName: newUser.fullName,
      role: roleDoc.roleName,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    if (user.isActive === false) {
      res.status(403).json({ message: 'User is deactivated' });
      return;
    }

    let authResult: any;
    try {
      const { clientId } = await getCognitoParams();
      const authResponse = await cognitoClient.send(
        new InitiateAuthCommand({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: clientId,
          AuthParameters: { USERNAME: email, PASSWORD: password },
        })
      );
      authResult = authResponse.AuthenticationResult;
    } catch (cognitoError: any) {
      console.error('Cognito login error:', cognitoError);
      res.status(401).json({ message: 'Invalid credentials', error: cognitoError.message });
      return;
    }

    if (!authResult) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const userRoles = await UserRole.find({ userId: user._id }).populate({
      path: 'roleId',
      model: 'Role',
    });
    const roles = userRoles.map((ur: any) => ur.roleId.roleName);

    res.status(200).json({
      accessToken: authResult.AccessToken,
      refreshToken: authResult.RefreshToken,
      idToken: authResult.IdToken,
      expiresIn: authResult.ExpiresIn || 3600,
      user: {
        userId: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: roles[0] || 'Student',
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// POST /api/auth/refresh
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ message: 'Refresh token is required' });
      return;
    }

    try {
      const { clientId } = await getCognitoParams();
      const authResponse = await cognitoClient.send(
        new InitiateAuthCommand({
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          ClientId: clientId,
          AuthParameters: { REFRESH_TOKEN: refreshToken },
        })
      );
      const authResult = authResponse.AuthenticationResult;
      if (authResult) {
        res.status(200).json({
          accessToken: authResult.AccessToken,
          refreshToken: authResult.RefreshToken || refreshToken,
          idToken: authResult.IdToken,
          expiresIn: authResult.ExpiresIn || 3600,
        });
        return;
      }
    } catch (cognitoError) {
      // Fallback to local JWT
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ message: 'Invalid token payload' });
      return;
    }

    const userRoles = await UserRole.find({ userId: user._id }).populate({
      path: 'roleId',
      model: 'Role',
    });
    const roles = userRoles.map((ur: any) => ur.roleId.roleName);

    const newAccessToken = generateAccessToken(user, roles);
    const newRefreshToken = generateRefreshToken(user);

    res.status(200).json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    res.status(401).json({ message: 'Invalid refresh token', error: error.message });
  }
};

// GET /api/auth/profile
export const profile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const userRoles = await UserRole.find({ userId: user._id }).populate({
      path: 'roleId',
      model: 'Role',
    });
    const roles = userRoles.map((ur: any) => ur.roleId.roleName);

    res.status(200).json({
      userId: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      avatarURL: user.avatarURL,
      role: roles[0] || 'Student',
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// GET /api/auth/users
export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({});
    const userList = [];
    for (const u of users) {
      const userRoles = await UserRole.find({ userId: u._id }).populate({
        path: 'roleId',
        model: 'Role',
      });
      const roles = userRoles.map((ur: any) => ur.roleId.roleName);
      userList.push({
        userId: u._id.toString(),
        email: u.email,
        fullName: u.fullName,
        role: roles[0] || 'Student',
        isActive: u.isActive !== false,
        createdAt: u.createdAt,
      });
    }
    res.status(200).json(userList);
  } catch (error: any) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// PUT /api/auth/users/:id/role
export const updateRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.body;
    if (!role) {
      res.status(400).json({ message: 'Role is required' });
      return;
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    let roleDoc = await Role.findOne({ roleName: role });
    if (!roleDoc) roleDoc = await Role.create({ roleName: role });

    await UserRole.deleteMany({ userId: user._id });
    await UserRole.create({ userId: user._id, roleId: roleDoc._id });

    res.status(200).json({ message: 'Role updated successfully', role });
  } catch (error: any) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// PUT /api/auth/users/:id/deactivate
export const deactivateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { isActive } = req.body;
    if (isActive === undefined) {
      res.status(400).json({ message: 'isActive status is required' });
      return;
    }

    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: user.isActive,
    });
  } catch (error: any) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
