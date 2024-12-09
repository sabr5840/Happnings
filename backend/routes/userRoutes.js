// routes/userRoutes.js

const express = require('express');
const {
  registerUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
  logoutUser,
} = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware'); // Middleware til beskyttelse af ruter

const router = express.Router();

// Public routes (ingen token påkrævet)
router.post('/register', registerUser); // Opret ny bruger
router.post('/login', loginUser); // Log ind
router.post('/logout', logoutUser); // Log ud

// Protected routes (kræver gyldig token via authMiddleware)
router.get('/', authMiddleware, getUsers); // Hent alle brugere (beskyttet)
router.get('/:id', authMiddleware, getUserById); // Hent en specifik bruger (beskyttet)
router.put('/:id', authMiddleware, updateUser); // Opdater en bruger (beskyttet)
router.delete('/:id', authMiddleware, deleteUser); // Slet en bruger (beskyttet)

module.exports = router;
