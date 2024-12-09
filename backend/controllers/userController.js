// controllers/userController.js

const { db, admin } = require('../config/firebaseAdmin');

// Register a new user
exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Opret bruger med Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Gem yderligere oplysninger i Firestore
    await db.collection('users').doc(userRecord.uid).set({
      Name: name,
      Email: email,
      Date_of_registration: new Date(),
      FCM_Token: null, // Placeholder, opdateres ved login
    });

    res.status(201).json({ message: 'User registered successfully', userId: userRecord.uid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login a user
exports.loginUser = async (req, res) => {
  const { email, password, token } = req.body;

  try {
    if (!email || !password || !token) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Hent bruger via Firebase Authentication
    const user = await admin.auth().getUserByEmail(email);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verificer adgangskode via REST API (du kan også bruge Firebase Client SDK i frontend)
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(401).json({ message: 'Invalid credentials', error: errorData });
    }

    const responseData = await response.json();
    const idToken = responseData.idToken;

    // Opdater FCM-token i Firestore
    await db.collection('users').doc(user.uid).update({ FCM_Token: token });

    // Returner ID-token og brugerdata
    res.json({ message: 'Login successful', userId: user.uid, token: idToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Logout a user
exports.logoutUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
};

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();

    const users = snapshot.docs.map((doc) => ({
      userId: doc.id,
      ...doc.data(),
    }));

    res.json(users);
  } catch (error) {
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
    res.status(500).json({ error: error.message });
  }
};

// Update a user
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;

  try {
    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : undefined;

    const updatedData = {
      ...(name && { Name: name }),
      ...(email && { Email: email }),
      ...(hashedPassword && { Password: hashedPassword }),
    };

    const userRef = db.collection('users').doc(id);
    await userRef.update(updatedData);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a user
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    // Slet bruger fra Firebase Authentication
    await admin.auth().deleteUser(id);

    // Slet bruger fra Firestore
    await db.collection('users').doc(id).delete();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
