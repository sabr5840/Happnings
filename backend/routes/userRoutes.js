// routes/userRoutes.js
const db = require('../config/db');

const express = require('express');
const {
  registerUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
  logoutUser
} = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

// Protected routes
router.get('/protected-route', authMiddleware, (req, res) => {
  res.json({ message: 'This is a protected route' });
});

router.get('/', authMiddleware, getUsers);
router.get('/:id', authMiddleware, getUserById);
router.put('/:id', authMiddleware, updateUser);
router.delete('/:id', authMiddleware, deleteUser);


// Example endpoint to save FCM token
router.post('/save-token', authMiddleware, async (req, res) => {
  const { userId, token } = req.body;
  try {
    await db.query('UPDATE User SET FCM_Token = ? WHERE User_ID = ?', [token, userId]);
    res.send({ message: "Token saved successfully" });
  } catch (error) {
    res.status(500).send({ message: "Failed to save token", error: error.message });
  }
});




module.exports = router;
