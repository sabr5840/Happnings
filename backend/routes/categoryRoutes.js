const express = require('express');
const router = express.Router();
const { getCategories } = require('../controllers/CategoryController');

// Route to fetch all categories
router.get('/categories', getCategories);

module.exports = router;
