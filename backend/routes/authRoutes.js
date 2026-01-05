const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('../firebaseAdmin');
const User = require('../models/user');
const router = express.Router();


const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token not found' });
  }

  try {
     const secret = process.env.JWT_SECRET || 'testsecret';
    const decoded = jwt.verify(token, secret);
    req.user = decoded; 
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

router.post('/register', async (req, res) => {
  const { name, username, email, password } = req.body;
  

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  try {
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already registered' });
    }
// const existingUsername = await User.findOne({ username });
// if (existingUsername) {
//   return res.status(400).json({ message: 'Username already taken' });
// }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, username, email, password: hashedPassword });

    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30m' });
    res.json({ token, user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30m' });
    res.json({ token, user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: 'Login failed' });
  }
});

router.get('/protected', authenticateToken, async (req, res) => {
  
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'Protected data access granted', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});




router.post('/auth', async (req, res) => {
  const { idToken, isSignUp } = req.body;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUID = decodedToken.uid;
    const email = decodedToken.email;
    const name = decodedToken.name || 'Unknown';

    let user = await User.findOne({ firebaseUID });

    if (isSignUp) {
      if (user) {
        return res.status(400).json({ error: 'User already exists, please log in instead' });
      }
      user = new User({ firebaseUID, email, name });
      await user.save();
    } else {
      if (!user) {
        return res.status(404).json({ error: 'No user found. Please sign up first.' });
      }
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30m' });
    res.json({
      success: true,
      token,
      user: {
        email: user.email,
        name: user.name,
        firebaseUID: user.firebaseUID,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during auth process' });
  }
});



module.exports = router;
