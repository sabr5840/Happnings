// middleware/authMiddleware.js

const authMiddleware = (req, res, next) => {

      if (!req.session.userId) {
      return res.status(401).json({ message: 'Access denied. Not logged in.' });
    }
  
    next();
  };
  
  module.exports = authMiddleware;
  