const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { validateBody } = require('../middleware/validate');

/**
 * GET /api/vehicles - Get all vehicles (admin)
 */
router.get('/', async (req, res, next) => {
  try {
    if (!db) return res.status(200).json({ success: true, count: 0, data: [] });

    const snap = await db.collection('vehicles').get();
    const vehicles = [];
    snap.forEach(doc => vehicles.push({ id: doc.id, ...doc.data() }));

    res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/vehicles/owner/:ownerId - Get owner's vehicles
 */
router.get('/owner/:ownerId', async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    if (!db) return res.status(200).json({ success: true, count: 0, data: [] });

    const snap = await db.collection('vehicles').where('ownerId', '==', ownerId).get();
    const vehicles = [];
    snap.forEach(doc => vehicles.push({ id: doc.id, ...doc.data() }));

    res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/vehicles - Add new vehicle (with default 30L fuel quota)
 */
router.post('/', validateBody(['plateNumber', 'model', 'seats']), async (req, res, next) => {
  try {
    const {
      ownerId = 'system_owner',
      ownerName = 'Fleet Owner',
      plateNumber,
      model,
      brand,
      seats,
      fuelType = 'Petrol Octane 92',
      fuelQuota = 30.0
    } = req.body;

    const vehicleData = {
      ownerId,
      ownerName,
      plateNumber: plateNumber.toUpperCase().trim(),
      model,
      brand: brand || model.split(' ')[0] || 'Vehicle',
      seats: parseInt(seats, 10),
      fuelType,
      fuelQuota: parseFloat(fuelQuota),
      maxMonthlyQuota: 30.0,
      status: 'active',
      assignedDriverId: null,
      assignedDriverName: null,
      createdAt: new Date().toISOString()
    };

    let id = `veh_${Date.now()}`;
    if (db) {
      const docRef = await db.collection('vehicles').add(vehicleData);
      id = docRef.id;
    }

    res.status(201).json({
      success: true,
      message: 'Vehicle added to fleet with 30L initial fuel quota',
      data: { id, ...vehicleData }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/vehicles/:id - Get vehicle details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!db) return res.status(200).json({ success: true, data: { id } });

    const doc = await db.collection('vehicles').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Vehicle not found', code: 'VEHICLE_NOT_FOUND' });
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
 * PUT /api/vehicles/:id - Update vehicle
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updatedAt: new Date().toISOString() };

    if (db) {
      await db.collection('vehicles').doc(id).update(updates);
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle details updated successfully',
      data: { id, ...updates }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/vehicles/:id - Delete vehicle
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (db) {
      await db.collection('vehicles').doc(id).delete();
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle removed from fleet'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
