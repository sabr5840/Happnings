require('dotenv').config(); // Indlæs miljøvariabler fra .env

const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const serviceAccount = require('./happnings-d76a6-firebase-adminsdk-rb4zp-808b20abc7.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://happnings-d76a6.firebaseio.com', // Din Firebase Database URL.
});

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

console.log('Firebase Config Loaded:', firebaseConfig);

const firebaseApp = initializeApp(firebaseConfig);

const db = admin.firestore();

module.exports = { admin, db, firebaseApp };
