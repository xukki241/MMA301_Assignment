const { verifyToken } = require('../config/tokenVerifier');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header is missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = await verifyToken(token);
    req.user = decoded; // Contains { userId, email, fullName, roles }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token', error: error.message });
  }
};
