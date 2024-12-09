// server.js

const express = require('express');
const dotenv = require('dotenv');
const session = require('express-session');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const eventRoutes = require('./routes/eventRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config();

const app = express();

// Middleware for parsing JSON requests
app.use(express.json());

// Enable CORS with credentials
app.use(
  cors({
    origin: [
      'http://localhost:3000', // Frontend udviklingsserver
      'https://happnings-backend-ddh5gnd3f8fvbxdt.northeurope-01.azurewebsites.net', // Backend server (Azure)
    ],
    credentials: true,
  })
);

// Initialize session middleware
app.use(cookieParser());
app.use(
  session({
    key: 'connect.sid',
    secret: process.env.SESSION_SECRET || '1627hd8jdppæpy', // Brug miljøvariabel eller fallback
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Skal sættes til true, når du bruger HTTPS
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60, // 1 time
    },
  })
);

// Test Firestore connection
const { db } = require('./config/firebaseAdmin');
app.get('/api/db-test', async (req, res) => {
  try {
    const testRef = db.collection('test').doc('connection');
    await testRef.set({ connected: true, timestamp: new Date() });
    const doc = await testRef.get();

    if (doc.exists) {
      res.json({ message: 'Firestore connection successful', data: doc.data() });
    } else {
      res.status(404).json({ message: 'No data found in test document' });
    }
  } catch (error) {
    console.error('Firestore connection error:', error);
    res.status(500).json({ message: 'Firestore connection failed', error: error.message });
  }
});

// Simple root endpoint
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Use your routes
app.use('/api/users', userRoutes); // Ruter til brugerhåndtering
app.use('/api/categories', categoryRoutes); // Ruter til kategorier
app.use('/api/notifications', notificationRoutes); // Ruter til notifikationer
app.use('/api/events', eventRoutes); // Ruter til events
app.use('/api/favorites', favoriteRoutes); // Ruter til favoritter

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
