const express = require('express');
const {
  registerUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
  logoutUser,
} = require('../controllers/userController'); // Import user-related controller functions
const authMiddleware = require('../middleware/authMiddleware'); 

const router = express.Router(); // Create a new router instance

// Public routes

// Route for user registration (open to all users)
router.post('/register', registerUser);

// Route for user login (open to all users)
router.post('/login', loginUser);

// Route for user logout (open to logged-in users, session-based)
router.post('/logout', logoutUser);

// Protected routes (require authentication via authMiddleware)
// Route to retrieve all users (Postman test use only)
router.get('/', authMiddleware, getUsers);

// Route to retrieve a specific user by ID (accessible to authenticated users only)
router.get('/:id', authMiddleware, getUserById);

// Route to update user details (accessible to authenticated users only)
router.put('/:id', authMiddleware, updateUser);

// Route to delete a user account (accessible to authenticated users only)
router.delete('/:id', authMiddleware, deleteUser);

module.exports = router;
