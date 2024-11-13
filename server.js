// server.js

const express = require('express');
const session = require('express-session');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const db = require('./config/db');
const cookieParser = require('cookie-parser');
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');

// Load environment variables
dotenv.config();

const app = express();

// Middleware for JSON requests
app.use(express.json());

// Enable CORS with credentials
app.use(
  cors({
    origin: 'http://localhost:3000', // Update this if your client runs on a different origin
    credentials: true
  })
);

// Session store configuration using MySQL
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: 3306, // Update if your MySQL runs on a different port
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Session configuration
app.use(cookieParser());
app.use(
  session({
    key: 'connect.sid',
    secret: process.env.SESSION_SECRET || '1627hd8jdppæpy',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 // Session runs out after 1 hour
    }
  })
);


// Use user routes after session middleware
app.use('/api/users', userRoutes);

// Test the database connection (optional)
app.get('/api/db-test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1'); // Simple query to test the database connection
    res.json({ message: 'Database connection successful', rows });
  } catch (error) {
    res.status(500).json({ message: 'Database connection failed', error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const categoryRoutes = require('./routes/categoryRoutes');
app.use('/api/categories', categoryRoutes);

const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/notifications', notificationRoutes);

const eventRoutes = require('./routes/eventRoutes');
app.use('/api/events', eventRoutes);
