const express = require('express');
const session = require('express-session'); 
const { admin, db } = require('./config/firebaseAdmin'); 
const userRoutes = require('./routes/userRoutes'); 
const eventRoutes = require('./routes/eventRoutes'); 
const categoryRoutes = require('./routes/categoryRoutes'); 
const favoriteRoutes = require('./routes/favoriteRoutes'); 
const rateLimit = require('express-rate-limit'); // Rate limiting middleware

require('dotenv').config(); // Load environment variables

//test use only - remove when in production 
console.log('Firebase API Key:', process.env.FIREBASE_API_KEY);
console.log('Firebase Auth Domain:', process.env.FIREBASE_AUTH_DOMAIN);
console.log('Ticketmaster API Key:', process.env.TICKETMASTER_API_KEY);
console.log('Geocoding API Key:', process.env.API_KEY_GEOCODING);


const app = express();

// Rate Limiting Configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Max 100 requests per windowMs per IP
});

// Apply rate limiter to all requests
app.use(apiLimiter);


// Middleware
app.use(express.json());  // Parse incoming JSON requests
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your_secret_key', // Use secure secret from .env
    resave: false, // Avoid resaving unchanged sessions
    saveUninitialized: true, // Save uninitialized sessions
    cookie: { secure: false }, // Set to true if HTTPS is enabled
  })
);

// Test Routes for Firebase and Firestore
app.get('/test-firebase', async (req, res) => {
  try {
    const users = await admin.auth().listUsers(); // Fetch all Firebase users
    res.status(200).json(users.users);
  } catch (error) {
    console.error('Fejl ved Firebase:', error);
    res.status(500).send('Der opstod en fejl med Firebase');
  }
});

// Test Firestore - fetch data from "favorite" collection
app.get('/test-firestore', async (req, res) => {
  try {
    const db = admin.firestore(); // Access Firestore database
    const snapshot = await db.collection('favorite').get(); // Fetch "favorite" collection
    const favorites = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(favorites);
  } catch (error) {
    console.error('Fejl ved Firestore:', error);
    res.status(500).send('Der opstod en fejl med Firestore');
  }
});

// Modular Routes

// User management
app.use('/api/users', userRoutes);

// Category management
app.use('/api/categories', categoryRoutes); 

// Event management
app.use('/api/events', eventRoutes);

// Favorites management
app.use('/api/favorites', favoriteRoutes);


// Logging Middleware
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});


// Start server 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  //test use only - remove when in production 
  console.log('Firebase Config Loaded:', {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID,
  });

  console.log('Server Environment Variables:');
  console.log(`FIREBASE_API_KEY: ${process.env.FIREBASE_API_KEY}`);
  console.log(`Serveren kører på port ${PORT}`);
});
