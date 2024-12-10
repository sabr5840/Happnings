// backend/middleware/validateInput.js

// Validerer, at eventId er en ikke-tom streng
const validateEventId = (req, res, next) => {
  const { eventId } = req.body;
  if (!eventId || typeof eventId !== 'string' || eventId.trim() === '') {
      return res.status(400).json({ message: 'Invalid or missing Event ID' });
  }
  next();
};

// Justeret til at acceptere en string ID for favoriteId, ikke et tal
const validateFavoriteId = (req, res, next) => {
  const { favoriteId } = req.params;
  if (!favoriteId || typeof favoriteId !== 'string' || favoriteId.trim() === '') {
      return res.status(400).json({ message: 'Invalid or missing Favorite ID' });
  }
  next();
};

module.exports = { validateEventId, validateFavoriteId };
