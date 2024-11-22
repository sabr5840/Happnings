// controllers/userController.js

const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Register a new user
exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if the user already exists
    const [existingUser] = await db.query('SELECT * FROM User WHERE Email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a placeholder FCM token for the new user
    const placeholderToken = `fcm_token_${Date.now()}`;

    // Insert user into the database including the placeholder FCM token
    const [result] = await db.query(
      'INSERT INTO User (Name, Email, Password, FCM_Token) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, placeholderToken]
    );

    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login a user
exports.loginUser = async (req, res) => {
  const { email, password, token } = req.body; // Assume token is sent from the client

  try {
    const [user] = await db.query('SELECT * FROM User WHERE Email = ?', [email]);
    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const validPassword = await bcrypt.compare(password, user[0].Password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // Update token in the database
    await db.query('UPDATE User SET FCM_Token = ? WHERE User_ID = ?', [token, user[0].User_ID]);

    // Save user's ID in the session
    req.session.userId = user[0].User_ID;
    req.session.save((err) => {
      if (err) {
        return res.status(500).json({ message: 'Session save error' });
      }

      res.json({ message: 'Login successful', token: token });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Log out 
exports.logoutUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.clearCookie('connect.sid'); // Fjern session-cookien
    res.json({ message: 'Logout successful' });
  });
};

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const [users] = await db.query('SELECT User_ID, Name, Email, Date_of_registration FROM User');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Retrieve a specific user based on ID
exports.getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const [user] = await db.query(
      'SELECT User_ID, Name, Email, Date_of_registration FROM User WHERE User_ID = ?',
      [id]
    );

    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a user
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'UPDATE User SET Name = ?, Email = ?, Password = ? WHERE User_ID = ?',
      [name, email, hashedPassword, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a user
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM User WHERE User_ID = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

