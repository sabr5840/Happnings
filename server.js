const express = require('express');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes'); // Import userRoutes
const db = require('./config/db'); // Import db.js to use the database connection

// Load environment variables
dotenv.config();

const app = express();

// Middleware for JSON requests
app.use(express.json());

// Test the database connection (optional)
app.get('/api/db-test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1'); // Simple query to test the database connection
    res.json({ message: 'Database connection successful', rows });
  } catch (error) {
    res.status(500).json({ message: 'Database connection failed', error: error.message });
  }
});

app.use('/api/users', userRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
