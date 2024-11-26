const fs = require('fs');
const mysql = require('mysql2/promise'); // Brug mysql2/promise for bedre integration med async/await
const express = require('express');
const dotenv = require('dotenv');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const eventRoutes = require('./routes/eventRoutes');
const cors = require('cors');
const cookieParser = require('cookie-parser');

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

// Database connection options
const dbOptions = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: {
    ca: fs.readFileSync(__dirname + '/certs/azure-ca.pem'), // Certifikatsti
    rejectUnauthorized: false // Midlertidig løsning
  }
};

// Initialiser MySQL-forbindelsen
const connection = mysql.createPool(dbOptions);

// Initialiser MySQLStore til sessioner
const sessionStore = new MySQLStore({}, connection);

// Session konfiguration
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
      maxAge: 1000 * 60 * 60 // 1 time
    }
  })
);

// Test databaseforbindelsen
app.get('/api/db-test', async (req, res) => {
  try {
    const [rows] = await connection.query('SELECT 1'); // Brug "connection" her
    res.json({ message: 'Database connection successful', rows });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ message: 'Database connection failed', error: error.message });
  }
});

// Brug dine routes efter session middleware
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/events', eventRoutes);
app.use('/api', categoryRoutes);


// Start serveren
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
