const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/CategoryController');

// Route to fetch all categories
router.get('/', CategoryController.getCategories);

module.exports = router;
