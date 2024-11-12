// routes/userRoutes.js

const express = require('express');

const { registerUser, getUsers, getUserById, updateUser, deleteUser } = require('../controllers/userController');
const router = express.Router();

// Create a user
router.post('/register', registerUser);

// Get all users 
router.get('/', getUsers);

// Get all a user based on a ID
router.get('/:id', getUserById);

// Update a user
router.put('/:id', updateUser);

// Delete a user 
router.delete('/:id', deleteUser);

module.exports = router;
