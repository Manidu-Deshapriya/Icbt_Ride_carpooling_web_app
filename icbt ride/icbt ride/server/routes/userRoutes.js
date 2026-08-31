const express = require('express');
const router = express.Router();
const { db, auth } = require('../config/firebase');
const { validateBody } = require('../middleware/validate');

/**
 * GET /api/users/pending - Get pending users for admin approval
 */
router.get('/pending', async (req, res, next) => {
  try {
    if (!db) return res.status(200).json({ success: true, count: 0, data: [] });

    const snap = await db.collection('users').where('status', '==', 'pending_approval').get();
    const users = [];
    snap.forEach(doc => users.push({ id: doc.id, ...doc.data() }));

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users - Get all users (admin only)
 */
router.get('/', async (req, res, next) => {
  try {
    const { role, status } = req.query;
    if (!db) return res.status(200).json({ success: true, count: 0, data: [] });

    let snap = await db.collection('users').get();
    let users = [];
    snap.forEach(doc => users.push({ id: doc.id, ...doc.data() }));

    if (role) {
      users = users.filter(u => u.role === role.toLowerCase());
    }
    if (status) {
      users = users.filter(u => u.status === status.toLowerCase());
    }

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:id - Get user details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!db) return res.status(200).json({ success: true, data: { id } });

    const doc = await db.collection('users').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    res.status(200).json({
      success: true,
      data: { id: doc.id, ...doc.data() }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/:id/role - Update user role (admin only)
 */
router.put('/:id/role', validateBody(['role']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (db) {
      await db.collection('users').doc(id).update({
        role: role.toLowerCase(),
        updatedAt: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: { id, role }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/:id/status - Update user status (verify/suspend/approve)
 */
router.put('/:id/status', validateBody(['status']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (db) {
      await db.collection('users').doc(id).update({
        status: status.toLowerCase(),
        statusUpdatedAt: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: `User status changed to ${status}`,
      data: { id, status }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/users/:id - Delete user (admin only)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (db) {
      await db.collection('users').doc(id).delete();
    }
    if (auth) {
      try {
        await auth.deleteUser(id);
      } catch (err) {
        console.warn(`[User Delete] Auth record removal warning:`, err.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'User removed from system'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
