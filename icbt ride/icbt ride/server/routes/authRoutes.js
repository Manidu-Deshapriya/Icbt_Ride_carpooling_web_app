const express = require('express');
const router = express.Router();
const { auth, db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

/**
 * POST /api/auth/register - Register new user (passenger/driver/owner)
 */
router.post('/register', validateBody(['email', 'password', 'role', 'name']), async (req, res, next) => {
  try {
    const { email, password, role, name, phone, nic, studentId, emergencyContact } = req.body;

    let uid = `user_${Date.now()}`;
    
    // Create in Firebase Auth if Admin SDK is connected
    if (auth) {
      try {
        const userRecord = await auth.createUser({
          email,
          password,
          displayName: name,
          phoneNumber: phone && phone.startsWith('+') ? phone : undefined
        });
        uid = userRecord.uid;
      } catch (authErr) {
        if (authErr.code === 'auth/email-already-exists') {
          return res.status(400).json({
            success: false,
            error: 'The email address is already in use by another account.',
            code: 'AUTH_EMAIL_EXISTS'
          });
        }
        throw authErr;
      }
    }

    const userData = {
      uid,
      name,
      email,
      role: role.toLowerCase(),
      phone: phone || '',
      nic: nic || '',
      studentId: studentId || '',
      emergencyContact: emergencyContact || '',
      status: role.toLowerCase() === 'passenger' ? 'active' : 'pending_approval',
      walletBalance: 0,
      rating: 5.0,
      totalRides: 0,
      createdAt: new Date().toISOString()
    };

    if (db) {
      await db.collection('users').doc(uid).set(userData);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        status: userData.status
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login - Login user session check
 */
router.post('/login', validateBody(['email']), async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!db) {
      return res.status(200).json({
        success: true,
        message: 'Login session verified',
        data: { email, role: 'passenger' }
      });
    }

    const userSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (userSnap.empty) {
      return res.status(404).json({
        success: false,
        error: 'User not found in system database.',
        code: 'USER_NOT_FOUND'
      });
    }

    const userData = userSnap.docs[0].data();
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        uid: userSnap.docs[0].id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        status: userData.status,
        walletBalance: userData.walletBalance || 0
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout - Logout user
 */
router.post('/logout', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User logged out successfully'
  });
});

/**
 * GET /api/auth/me - Get current user profile
 */
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    if (!db || !req.user || !req.user.uid) {
      return res.status(200).json({
        success: true,
        data: req.user || { role: 'passenger' }
      });
    }

    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    res.status(200).json({
      success: true,
      data: { id: userDoc.id, ...userDoc.data() }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/verify-token - Verify Firebase ID token
 */
router.post('/verify-token', validateBody(['idToken']), async (req, res, next) => {
  try {
    const { idToken } = req.body;
    let decoded = null;

    if (auth) {
      decoded = await auth.verifyIdToken(idToken);
    } else {
      decoded = { uid: idToken, email: 'user@icbtride.lk' };
    }

    res.status(200).json({
      success: true,
      message: 'Token verified successfully',
      data: decoded
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'TOKEN_INVALID',
      details: error.message
    });
  }
});

module.exports = router;
