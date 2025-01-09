const express = require('express'); // Import Express library to create router
const router = express.Router(); // Create a new router object to manage routes

// Import CategoryController from controllers directory
const CategoryController = require('../controllers/CategoryController');

// Route to fetch all categories
// This route listens for GET requests on the root path relative to where it is mounted.
// It delegates handling of these requests to the getCategories method of the CategoryController.
router.get('/', CategoryController.getCategories);

// Export the router so it can be used in other parts of the application
module.exports = router;
