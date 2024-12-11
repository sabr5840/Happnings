const { db, admin } = require('../config/firebaseAdmin');
const fetch = require('node-fetch');

// Register a new user
exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    await db.collection('users').doc(userRecord.uid).set({
      Name: name,
      Email: email,
      Date_of_registration: new Date(),
      FCM_Token: null,
    });

    res.status(201).json({ message: 'User registered successfully', userId: userRecord.uid });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Login a user
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

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

    req.session.userId = responseData.localId; // Gemmer brugerens ID i sessionen
    res.json({
      message: 'Login successful',
      userId: responseData.localId,
      token: responseData.idToken, // Firebase returnerer en autentificeringstoken (idToken)
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Logout a user
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

// Get all users
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

// Retrieve a specific user based on ID
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

// Update a user
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;

  try {
    const updatedData = {
      ...(name && { Name: name }),
      ...(email && { Email: email }),
      ...(password && { Password: password }),
    };

    const userRef = db.collection('users').doc(id);
    await userRef.update(updatedData);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update User Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a user
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  const sessionId = req.session.userId; // Assuming session stores userId
  console.log("Session ID:", sessionId, "Request ID:", id); // Tilføjer logning for at se værdierne

  if (sessionId !== id) {
    return res.status(403).json({ message: 'You are not authorized to delete this account' });
  }

  try {
    await admin.auth().deleteUser(id);
    await db.collection('users').doc(id).delete();
    if (req.session) {
      req.session.destroy(); // End the session after account deletion
    }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({ error: error.message });
  }
};



