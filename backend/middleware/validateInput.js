// middleware/validateInput.js

// Validerer, at eventId er et tal og ikke tomt
const validateEventId = (req, res, next) => {
    const { eventId } = req.body;
    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({ message: 'Invalid or missing Event ID' });
    }
    next();
  };
  
  // Validerer, at favoriteId er et tal og ikke tomt
  const validateFavoriteId = (req, res, next) => {
    const { favoriteId } = req.params;
    if (!favoriteId || isNaN(favoriteId)) {
      return res.status(400).json({ message: 'Invalid or missing Favorite ID' });
    }
    next();
  };
  
  module.exports = { validateEventId, validateFavoriteId };
  