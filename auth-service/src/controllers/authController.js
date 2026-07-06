const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const UserRole = require('../models/UserRole');
const {
  SignUpCommand,
  AdminConfirmSignUpCommand,
  InitiateAuthCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const { cognitoClient, getCognitoParams } = require("../config/cognito");

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123!';
const ACCESS_TOKEN_EXPIRY = '1h'; // 3600 seconds
const REFRESH_TOKEN_EXPIRY = '7d';

const generateAccessToken = (user, roles) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      roles,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
    },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ message: 'All fields (email, password, fullName, role) are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Register user in Cognito first
    let cognitoSub = '';
    try {
      const { userPoolId, clientId } = await getCognitoParams();
      
      const signUpRes = await cognitoClient.send(new SignUpCommand({
        ClientId: clientId,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'name', Value: fullName }
        ]
      }));

      cognitoSub = signUpRes.UserSub;

      // Confirm sign up automatically in LocalStack
      await cognitoClient.send(new AdminConfirmSignUpCommand({
        UserPoolId: userPoolId,
        Username: email
      }));
    } catch (cognitoError) {
      console.error("Cognito registration error:", cognitoError);
      return res.status(400).json({ message: 'Cognito registration failed', error: cognitoError.message });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      email,
      passwordHash,
      fullName,
      cognitoSub,
    });

    // Find or create role
    let roleDoc = await Role.findOne({ roleName: role });
    if (!roleDoc) {
      roleDoc = await Role.create({ roleName: role });
    }

    // Map user to role
    await UserRole.create({
      userId: newUser._id,
      roleId: roleDoc._id,
    });

    res.status(201).json({
      message: 'User registered successfully',
      userId: newUser._id.toString(),
      email: newUser.email,
      fullName: newUser.fullName,
      role: roleDoc.roleName,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user in MongoDB
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'User is deactivated' });
    }

    // Authenticate user against LocalStack Cognito
    let authResult;
    try {
      const { clientId } = await getCognitoParams();
      const authResponse = await cognitoClient.send(new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        }
      }));
      authResult = authResponse.AuthenticationResult;
    } catch (cognitoError) {
      console.error("Cognito login error:", cognitoError);
      return res.status(401).json({ message: 'Invalid credentials', error: cognitoError.message });
    }

    if (!authResult) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Fetch user roles
    const userRoles = await UserRole.find({ userId: user._id }).populate({
      path: 'roleId',
      model: 'Role',
    });
    const roles = userRoles.map((ur) => ur.roleId.roleName);

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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// POST /api/auth/refresh
exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    // Try Cognito refresh token flow first
    try {
      const { clientId } = await getCognitoParams();
      const authResponse = await cognitoClient.send(new InitiateAuthCommand({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        }
      }));

      const authResult = authResponse.AuthenticationResult;
      if (authResult) {
        return res.status(200).json({
          accessToken: authResult.AccessToken,
          refreshToken: authResult.RefreshToken || refreshToken,
          idToken: authResult.IdToken,
          expiresIn: authResult.ExpiresIn || 3600
        });
      }
    } catch (cognitoError) {
      // Fallback to local JWT verification on Cognito failures (e.g. for mock tests)
    }

    // Verify token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    // Fetch user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    // Fetch roles
    const userRoles = await UserRole.find({ userId: user._id }).populate({
      path: 'roleId',
      model: 'Role',
    });
    const roles = userRoles.map((ur) => ur.roleId.roleName);

    // Generate new tokens
    const newAccessToken = generateAccessToken(user, roles);
    const newRefreshToken = generateRefreshToken(user);

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ message: 'Invalid refresh token', error: error.message });
  }
};

// GET /api/auth/profile
exports.profile = async (req, res) => {
  try {
    // User object is populated by token authentication middleware
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userRoles = await UserRole.find({ userId: user._id }).populate({
      path: 'roleId',
      model: 'Role',
    });
    const roles = userRoles.map((ur) => ur.roleId.roleName);

    res.status(200).json({
      userId: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      avatarURL: user.avatarURL,
      role: roles[0] || 'Student',
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// GET /api/auth/users
exports.listUsers = async (req, res) => {
  try {
    const users = await User.find({});
    const userList = [];
    for (const u of users) {
      const userRoles = await UserRole.find({ userId: u._id }).populate({
        path: 'roleId',
        model: 'Role',
      });
      const roles = userRoles.map((ur) => ur.roleId.roleName);
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
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// PUT /api/auth/users/:id/role
exports.updateRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find or create role
    let roleDoc = await Role.findOne({ roleName: role });
    if (!roleDoc) {
      roleDoc = await Role.create({ roleName: role });
    }

    // Update UserRole
    await UserRole.deleteMany({ userId: user._id });
    await UserRole.create({
      userId: user._id,
      roleId: roleDoc._id,
    });

    res.status(200).json({ message: 'Role updated successfully', role });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// PUT /api/auth/users/:id/deactivate
exports.deactivateUser = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (isActive === undefined) {
      return res.status(400).json({ message: 'isActive status is required' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: `User ${isActive ? 'activated' : 'deactivated'} successfully`, isActive: user.isActive });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
