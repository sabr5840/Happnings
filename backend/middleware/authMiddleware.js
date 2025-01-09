// Import Firebase Admin SDK instance
const { admin } = require('../config/firebaseAdmin'); 

// Authentication middleware
const authMiddleware = async (req, res, next) => {
  // Log all incoming headers for debugging purposes
  console.log('AuthMiddleware: Incoming request headers:', req.headers);

  const authHeader = req.headers.authorization; // Extract the Authorization header
  
  // Check if the Authorization header is missing or improperly formatted
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('AuthMiddleware: No valid Authorization header provided');
    return res.status(401).json({ message: 'No token provided' });
  }

  // Extract the token from the Authorization header
  const token = authHeader.split('Bearer ')[1].trim(); // Remove "Bearer " and any extra spaces
  console.log('AuthMiddleware: Full Token:', token); // Log the token for debugging purposes

  try {
    // Verify the Firebase ID token using the Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token); // Log decoded token for verification
    console.log('AuthMiddleware: Decoded Token:', decodedToken);

    // Attach the decoded token to the `req` object for use in subsequent handlers
    req.user = decodedToken;

    // Call the next middleware or route handler
    next();
  } catch (error) {
    
    // Log errors encountered during token verification
    console.error('AuthMiddleware: Error verifying token:', error);
    return res.status(401).json({ message: 'Unauthorized', error: error.message });
  }
};

// Export the middleware for use in other parts of the application
module.exports = authMiddleware;
