const express = require('express');
const { getCategories } = require('../controllers/CategoryController');
const router = express.Router();

// Route for getting all categories
router.get('/', getCategories);

module.exports = router;
