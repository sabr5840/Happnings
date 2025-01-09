
const { db, admin } = require('../config/firebaseAdmin');
const fetch = require('node-fetch');

// Register a new user with Firebase Authentication and store user details in Firestore
exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Ensure all required fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Store additional user information in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      Name: name,
      Email: email,
      Date_of_registration: new Date(),
      FCM_Token: null,
    });

    res.status(201).json({ message: 'User registered successfully', userId: userRecord.uid });
  } catch (error) {
    console.error('Registration Error:', error);
    if (error.errorInfo && error.errorInfo.code === 'auth/email-already-in-use') {
      return res.status(400).json({ error: { code: 'auth/email-already-in-use', message: 'The email address is already in use by another account.' } });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

// Authenticate a user via Firebase Authentication API
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {

    // Ensure all required fields are provided
    if (!email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Authenticate user using Firebase's REST API
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const responseData = await response.json();
    if (!response.ok) {
      console.error('Firebase Login Error:', responseData);
      return res.status(401).json({ message: 'Invalid credentials', error: responseData });
    }

    // Store user's ID in session after successful login
    req.session.userId = responseData.localId; // same user ID in session
    res.json({
      message: 'Login successful',
      userId: responseData.localId,
      token: responseData.idToken, 
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Logout user by destroying the session and clearing the session cookie
exports.logoutUser = (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Fejl ved sletning af session:', err);
        return res.status(500).json({ message: 'Logout failed', error: err.message });
      }
      res.clearCookie('connect.sid'); // Fjern session-cookie
      return res.json({ message: 'Logout successful' });
    });
  } else {
    return res.status(400).json({ message: 'No session found' });
  }
};

// Retrieve all users from Firestore
exports.getUsers = async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map((doc) => ({ userId: doc.id, ...doc.data() }));
    res.json(users);
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Retrieve a specific user by ID from Firestore
exports.getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const userRef = db.collection('users').doc(id);
    const user = await userRef.get();

    if (!user.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ userId: user.id, ...user.data() });
  } catch (error) {
    console.error('Get User by ID Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update user information in Firebase Authentication and Firestore
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;

  try {
    // Update email or password in Firebase Authentication if provided
    if (email || password) {
      const updatePayload = {};
      if (email) updatePayload.email = email;
      if (password) updatePayload.password = password;

      await admin.auth().updateUser(id, updatePayload);
    }

    // Update name or email in Firestore
    const updatedData = {
      ...(name && { Name: name }),
      ...(email && { Email: email }),
    };

    const userRef = db.collection('users').doc(id);
    await userRef.update(updatedData);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update User Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a user from Firebase Authentication and Firestore
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  const sessionId = req.session.userId; // Check session for user authorization
  console.log("Session ID:", sessionId, "Request ID:", id); 

  // Ensure the logged-in user is the same as the one being deleted
  if (sessionId !== id) {
    return res.status(403).json({ message: 'You are not authorized to delete this account' });
  }

  try {
    await admin.auth().deleteUser(id);
    await db.collection('users').doc(id).delete();
    if (req.session) {
      req.session.destroy(); // Optionally end the session after account deletion
    }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({ error: error.message });
  }
};



