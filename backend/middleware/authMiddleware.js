// backend/middleware/authMiddleware.js

const { admin } = require('../config/firebaseAdmin');

const authMiddleware = async (req, res, next) => {
  // Log alle indkommende headers for at debugge eventuelle problemer
  console.log('AuthMiddleware: Incoming request headers:', req.headers);

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('AuthMiddleware: No valid Authorization header provided');
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verificer ID-token med Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('AuthMiddleware: Decoded Token:', decodedToken);

    // Gem decoded token-info på request-objektet
    req.user = decodedToken;

    // Gå videre til næste middleware eller controller
    next();
  } catch (error) {
    console.error('AuthMiddleware: Error verifying token:', error.message);
    return res.status(401).json({ message: 'Unauthorized', error: error.message });
  }
};

module.exports = authMiddleware;
