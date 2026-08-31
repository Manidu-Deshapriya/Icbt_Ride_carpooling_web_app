const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { validateBody } = require('../middleware/validate');

/**
 * GET /api/assignments/owner/:ownerId - Get owner's driver assignments
 */
router.get('/owner/:ownerId', async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    if (!db) return res.status(200).json({ success: true, count: 0, data: [] });

    const snap = await db.collection('driverAssignments').where('ownerId', '==', ownerId).get();
    const assignments = [];
    snap.forEach(doc => assignments.push({ id: doc.id, ...doc.data() }));

    res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/assignments - Assign driver to vehicle
 */
router.post('/', validateBody(['ownerId', 'driverId', 'vehicleId']), async (req, res, next) => {
  try {
    const { ownerId, driverId, driverName, vehicleId, plateNumber, shift = 'Full Day', splitPercentage = 70 } = req.body;

    const assignmentData = {
      ownerId,
      driverId,
      driverName: driverName || 'Driver',
      vehicleId,
      plateNumber: plateNumber || '',
      shift,
      splitPercentage: parseFloat(splitPercentage),
      status: 'active',
      assignedAt: new Date().toISOString()
    };

    let id = `assign_${Date.now()}`;
    if (db) {
      const docRef = await db.collection('driverAssignments').add(assignmentData);
      id = docRef.id;

      // Update vehicle's current assigned driver
      await db.collection('vehicles').doc(vehicleId).update({
        assignedDriverId: driverId,
        assignedDriverName: driverName || 'Driver'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Driver successfully assigned to vehicle',
      data: { id, ...assignmentData }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/assignments/:id - Update assignment
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updatedAt: new Date().toISOString() };

    if (db) {
      await db.collection('driverAssignments').doc(id).update(updates);
    }

    res.status(200).json({
      success: true,
      message: 'Driver assignment updated',
      data: { id, ...updates }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/assignments/:id - Remove driver assignment
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (db) {
      const doc = await db.collection('driverAssignments').doc(id).get();
      if (doc.exists && doc.data().vehicleId) {
        // Clear assignment from vehicle
        await db.collection('vehicles').doc(doc.data().vehicleId).update({
          assignedDriverId: null,
          assignedDriverName: null
        });
      }
      await db.collection('driverAssignments').doc(id).delete();
    }

    res.status(200).json({
      success: true,
      message: 'Driver assignment removed successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/assignments/driver/:driverId - Get driver's assignments
 */
router.get('/driver/:driverId', async (req, res, next) => {
  try {
    const { driverId } = req.params;
    if (!db) return res.status(200).json({ success: true, count: 0, data: [] });

    const snap = await db.collection('driverAssignments').where('driverId', '==', driverId).get();
    const assignments = [];
    snap.forEach(doc => assignments.push({ id: doc.id, ...doc.data() }));

    res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
