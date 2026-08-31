const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { validateBody } = require('../middleware/validate');

/**
 * POST /api/payments - Create payment / wallet top-up
 */
router.post('/', validateBody(['userId', 'amount', 'paymentMethod']), async (req, res, next) => {
  try {
    const { userId, amount, paymentMethod, rideId, description } = req.body;

    const paymentData = {
      userId,
      amount: parseFloat(amount),
      paymentMethod,
      rideId: rideId || null,
      description: description || 'Ride Fare Payment',
      status: 'completed',
      transactionRef: `TXN_${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    let id = `pay_${Date.now()}`;
    if (db) {
      const docRef = await db.collection('payments').add(paymentData);
      id = docRef.id;

      // Update user wallet if topup
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const bal = userDoc.data().walletBalance || 0;
        await userRef.update({ walletBalance: bal + paymentData.amount });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Payment processed successfully',
      data: { id, ...paymentData }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payments/user/:userId - Get user's payments
 */
router.get('/user/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!db) return res.status(200).json({ success: true, count: 0, data: [] });

    const snap = await db.collection('payments').where('userId', '==', userId).get();
    const payments = [];
    snap.forEach(doc => payments.push({ id: doc.id, ...doc.data() }));

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payments/ride/:rideId - Get ride payments
 */
router.get('/ride/:rideId', async (req, res, next) => {
  try {
    const { rideId } = req.params;
    if (!db) return res.status(200).json({ success: true, count: 0, data: [] });

    const snap = await db.collection('payments').where('rideId', '==', rideId).get();
    const payments = [];
    snap.forEach(doc => payments.push({ id: doc.id, ...doc.data() }));

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/payments/:id/status - Update payment status
 */
router.put('/:id/status', validateBody(['status']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (db) {
      await db.collection('payments').doc(id).update({
        status,
        updatedAt: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment status updated',
      data: { id, status }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
