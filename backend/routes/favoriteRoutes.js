const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/FavoriteController');
const isAuthenticated = require('../middleware/authMiddleware');
const { validateEventId, validateFavoriteId } = require('../middleware/validateInput');

// Endpoints
router.post('/favorite', isAuthenticated, validateEventId, favoriteController.addToFavorite); // No need for validateEventExists since the controller fetches data from Ticketmaster
router.get('/favorite', isAuthenticated, favoriteController.getFavorite);
router.delete('/favorite/:favoriteId', isAuthenticated, validateFavoriteId, favoriteController.removeFromFavorite);

module.exports = router;
