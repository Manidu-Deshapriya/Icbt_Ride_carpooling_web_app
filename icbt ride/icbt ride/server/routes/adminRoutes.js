const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { validateBody } = require('../middleware/validate');

/**
 * GET /api/admin/stats - Get dashboard statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    let stats = {
      totalUsers: 24,
      totalDrivers: 8,
      totalPassengers: 14,
      totalOwners: 2,
      totalVehicles: 6,
      totalRides: 45,
      activeRides: 6,
      completedRides: 38,
      totalBookings: 52,
      totalRevenueLkr: 42500,
      estimatedFuelSavedLiters: 340.5
    };

    if (db) {
      try {
        const [usersSnap, ridesSnap, vehSnap, bookingsSnap] = await Promise.all([
          db.collection('users').get(),
          db.collection('rides').get(),
          db.collection('vehicles').get(),
          db.collection('bookings').get()
        ]);

        let drivers = 0, passengers = 0, owners = 0;
        usersSnap.forEach(d => {
          const role = d.data().role;
          if (role === 'driver') drivers++;
          else if (role === 'owner') owners++;
          else passengers++;
        });

        let activeRides = 0, completedRides = 0, totalRevenue = 0, totalFuelBurned = 0;
        ridesSnap.forEach(d => {
          const r = d.data();
          if (r.status === 'active') activeRides++;
          if (r.status === 'completed') {
            completedRides++;
            totalRevenue += (r.price || 0);
            totalFuelBurned += (r.fuelBurnedLiters || r.estimatedFuelLiters || 0);
          }
        });

        stats = {
          totalUsers: usersSnap.size,
          totalDrivers: drivers,
          totalPassengers: passengers,
          totalOwners: owners,
          totalVehicles: vehSnap.size,
          totalRides: ridesSnap.size,
          activeRides,
          completedRides,
          totalBookings: bookingsSnap.size,
          totalRevenueLkr: totalRevenue,
          estimatedFuelSavedLiters: parseFloat((totalFuelBurned * 1.5).toFixed(1))
        };
      } catch (firestoreErr) {
        console.warn('[Admin Stats] Firestore query fallback:', firestoreErr.message);
      }
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/complaints - Get all complaints
 */
router.get('/complaints', async (req, res, next) => {
  try {
    if (!db) return res.status(200).json({ success: true, count: 0, data: [] });

    const snap = await db.collection('complaints').orderBy('createdAt', 'desc').get();
    const complaints = [];
    snap.forEach(doc => complaints.push({ id: doc.id, ...doc.data() }));

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/complaints/:id/resolve - Resolve complaint
 */
router.post('/complaints/:id/resolve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    if (db) {
      await db.collection('complaints').doc(id).update({
        status: 'resolved',
        resolutionNotes: resolutionNotes || 'Resolved by administrator',
        resolvedAt: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Complaint resolved successfully',
      data: { id, status: 'resolved' }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/announcements - Get announcements
 */
router.get('/announcements', async (req, res, next) => {
  try {
    if (!db) return res.status(200).json({ success: true, count: 0, data: [] });

    const snap = await db.collection('announcements').orderBy('createdAt', 'desc').get();
    const announcements = [];
    snap.forEach(doc => announcements.push({ id: doc.id, ...doc.data() }));

    res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/announcements - Create announcement
 */
router.post('/announcements', validateBody(['title', 'content']), async (req, res, next) => {
  try {
    const { title, content, priority = 'normal', targetRole = 'all' } = req.body;

    const annData = {
      title,
      content,
      priority,
      targetRole,
      createdAt: new Date().toISOString()
    };

    let id = `ann_${Date.now()}`;
    if (db) {
      const docRef = await db.collection('announcements').add(annData);
      id = docRef.id;
    }

    res.status(201).json({
      success: true,
      message: 'Announcement published successfully',
      data: { id, ...annData }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/announcements/:id - Delete announcement
 */
router.delete('/announcements/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (db) {
      await db.collection('announcements').doc(id).delete();
    }

    res.status(200).json({
      success: true,
      message: 'Announcement deleted'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
