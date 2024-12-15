const express = require('express');
const session = require('express-session'); // Tilføj express-session
const { admin, db } = require('./config/firebaseAdmin'); // Korrekt sti til firebaseAdmin.js
const userRoutes = require('./routes/userRoutes'); // Importer userRoutes
const eventRoutes = require('./routes/eventRoutes'); // Importer eventRoutes
const categoryRoutes = require('./routes/categoryRoutes'); // Importer categoryRoutes
const favoriteRoutes = require('./routes/favoriteRoutes'); // Importer eventRoutes
const notificationRoutes = require('./routes/notificationRoutes'); // Importer notificationRoutes
const { sendPushNotification } = require('./utils/pushNotificationHelper');
const rateLimit = require('express-rate-limit');

require('dotenv').config(); // Tilføj miljøvariabler fra .env-filen

console.log('Firebase API Key:', process.env.FIREBASE_API_KEY);
console.log('Firebase Auth Domain:', process.env.FIREBASE_AUTH_DOMAIN);
console.log('Ticketmaster API Key:', process.env.TICKETMASTER_API_KEY);
console.log('Geocoding API Key:', process.env.API_KEY_GEOCODING);


const app = express();

// Rate Limiter Configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Limit each IP to 100 requests per windowMs
});

// Apply the rate limiting middleware to all requests
app.use(apiLimiter);


// Middleware
app.use(express.json()); // Parser JSON
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your_secret_key', // Brug din SESSION_SECRET fra .env
    resave: false, // Gem ikke sessionen igen, hvis der ikke er ændringer
    saveUninitialized: true, // Gem sessioner, selvom de ikke er initialiseret
    cookie: { secure: false }, // Sæt secure til true, hvis du bruger HTTPS
  })
);

// Test Firebase - Liste brugere
app.get('/test-firebase', async (req, res) => {
  try {
    const users = await admin.auth().listUsers();
    res.status(200).json(users.users);
  } catch (error) {
    console.error('Fejl ved Firebase:', error);
    res.status(500).send('Der opstod en fejl med Firebase');
  }
});

// Test Firestore - Hent data fra "favorite" collection
app.get('/test-firestore', async (req, res) => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('favorite').get();
    const favorites = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(favorites);
  } catch (error) {
    console.error('Fejl ved Firestore:', error);
    res.status(500).send('Der opstod en fejl med Firestore');
  }
});

// Brug ruterne
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes); 
app.use('/api/events', eventRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/notifications', notificationRoutes);

// Logging middleware
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// Tilføj et endpoint til at udløse en push-notifikation
app.get('/test-push', async (req, res) => {
  const testToken = 'dit_test_fcm_token_her'; // Erstat dette med et gyldigt FCM token
  try {
    const response = await sendPushNotification(testToken, 'Test Title', 'This is a test push notification.');
    res.status(200).json({ message: 'Push notification sent successfully', response });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send push notification', error: error.message });
  }
});


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
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
