const admin = require('firebase-admin'); //This is the Firebase Admin module.

// This JSON file contains your Firebase project's credentials. It’s used to authenticate and authorize the back-end service to interact with Firebase services.
const serviceAccount = require('./happnings-d76a6-firebase-adminsdk-rb4zp-18a24b2a86.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;


