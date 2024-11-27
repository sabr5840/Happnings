const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/FavoriteController');
const isAuthenticated = require('../middleware/authMiddleware');
const { validateEventId, validateFavoriteId } = require('../middleware/validateInput');
const validateEventExists = require('../middleware/validateEventExists');

// Endpoints
router.post('/favorite', isAuthenticated, validateEventId, validateEventExists, favoriteController.addToFavorite);
router.get('/favorite', isAuthenticated, favoriteController.getFavorite);
router.delete('/favorite/:favoriteId', isAuthenticated, validateFavoriteId, favoriteController.removeFromFavorite);

module.exports = router;