const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const FavoriteController = require('../controllers/FavoriteController');


// Rute til at tilføje event til favorites
router.post('/', authMiddleware, FavoriteController.addToFavorite);

// Rute til at hente alle favorit events
router.get('/', authMiddleware, FavoriteController.getFavorite);

// Rute til at fjerne event fra favorites
router.delete('/:favoriteId', authMiddleware, FavoriteController.removeFromFavorite);

module.exports = router;
