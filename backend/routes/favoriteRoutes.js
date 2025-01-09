const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware'); // Middleware to ensure user authentication
const FavoriteController = require('../controllers/FavoriteController'); // Controller to handle favorite-related operations

// Route to add an event to the user's favorites
// Protected by authMiddleware to ensure only authenticated users can perform this action
router.post('/', authMiddleware, FavoriteController.addToFavorite);

// Route to fetch all favorite events for the authenticated user
// Protected by authMiddleware to restrict access to the user's own favorites
router.get('/', authMiddleware, FavoriteController.getFavorite);

// Route to remove a specific event from the user's favorites
// Requires the favorite event ID as a parameter and is protected by authMiddleware
router.delete('/:favoriteId', authMiddleware, FavoriteController.removeFromFavorite);

// Export the router for use in the main application
module.exports = router;
