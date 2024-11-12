
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Register a new user
exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into database
    const [result] = await db.query(
      'INSERT INTO User (Name, Email, Password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

//Retrieve a specific user based on ID
exports.getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const [user] = await db.query('SELECT User_ID, Name, Email, Date_of_registration FROM User WHERE User_ID = ?', [id]);

    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//Update a user
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

//Delete a user
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

