const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { FuelService, FUEL_CONFIG } = require('../services/fuelService');
const { validateBody } = require('../middleware/validate');

/**
 * GET /api/fuel/quota/:vehicleId - Get vehicle fuel quota status
 */
router.get('/quota/:vehicleId', async (req, res, next) => {
  try {
    const { vehicleId } = req.params;

    if (!db) {
      return res.status(200).json({
        success: true,
        data: { vehicleId, fuelQuota: 30.0, maxMonthlyQuota: 30.0, percentage: 100 }
      });
    }

    const doc = await db.collection('vehicles').doc(vehicleId).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Vehicle not found', code: 'VEHICLE_NOT_FOUND' });
    }

    const v = doc.data();
    const quota = v.fuelQuota !== undefined ? v.fuelQuota : 30.0;
    const maxQuota = v.maxMonthlyQuota || 30.0;
    const pct = parseFloat(((quota / maxQuota) * 100).toFixed(1));
    const isLow = pct < FUEL_CONFIG.LOW_QUOTA_THRESHOLD_PERCENT;

    const oddEvenStatus = FuelService.isOddEvenEligible(v.plateNumber);

    res.status(200).json({
      success: true,
      data: {
        vehicleId: doc.id,
        plateNumber: v.plateNumber,
        model: v.model,
        fuelQuota: quota,
        maxMonthlyQuota: maxQuota,
        percentageRemaining: pct,
        isLowQuota: isLow,
        oddEvenStatus
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/fuel/refuel - Refuel vehicle (with odd-even check & 30L cap)
 */
router.post('/refuel', validateBody(['vehicleId', 'plateNumber', 'litersAdded']), async (req, res, next) => {
  try {
    const { vehicleId, plateNumber, litersAdded, refuelDate = new Date().toISOString() } = req.body;

    let currentQuota = 0.0;
    if (db) {
      const vDoc = await db.collection('vehicles').doc(vehicleId).get();
      if (vDoc.exists) {
        currentQuota = vDoc.data().fuelQuota || 0.0;
      }
    }

    // Business Logic Validation
    const validation = FuelService.validateRefuel(plateNumber, refuelDate, litersAdded, currentQuota);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        code: validation.code
      });
    }

    // Update database & log fuel transaction
    let logId = `refuel_${Date.now()}`;
    if (db) {
      await db.collection('vehicles').doc(vehicleId).update({
        fuelQuota: validation.newQuota,
        lastRefueledAt: new Date().toISOString()
      });

      const logRef = await db.collection('fuelTransactions').add({
        vehicleId,
        plateNumber,
        litersAdded: validation.litersAdded,
        costLkr: validation.totalCostLkr,
        resultingQuota: validation.newQuota,
        date: refuelDate,
        createdAt: new Date().toISOString()
      });
      logId = logRef.id;
    }

    res.status(200).json({
      success: true,
      message: `Successfully refueled ${validation.litersAdded}L. New balance: ${validation.newQuota}L.`,
      data: {
        transactionId: logId,
        ...validation
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/fuel/history/:vehicleId - Get fuel transaction history
 */
router.get('/history/:vehicleId', async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    if (!db) return res.status(200).json({ success: true, count: 0, data: [] });

    const snap = await db.collection('fuelTransactions').where('vehicleId', '==', vehicleId).get();
    const history = [];
    snap.forEach(doc => history.push({ id: doc.id, ...doc.data() }));

    res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/fuel/validate - Validate if ride can be created (fuel check)
 */
router.post('/validate', validateBody(['plateNumber', 'date', 'distanceKm']), (req, res) => {
  const { plateNumber, date, distanceKm, currentQuota = 30.0 } = req.body;

  const result = FuelService.validateRideCreation(plateNumber, date, distanceKm, currentQuota);

  if (!result.isValid) {
    return res.status(400).json({
      success: false,
      error: result.error,
      code: result.code,
      details: result
    });
  }

  res.status(200).json({
    success: true,
    message: 'Ride satisfies National Fuel Quota and Odd-Even plate restrictions.',
    data: result
  });
});

/**
 * PUT /api/fuel/quota/admin/:vehicleId - Admin adjust quota
 */
router.put('/quota/admin/:vehicleId', validateBody(['fuelQuota']), async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const { fuelQuota, reason = 'Administrative adjustment' } = req.body;

    const quota = Math.min(FUEL_CONFIG.DEFAULT_MONTHLY_QUOTA, Math.max(0, parseFloat(fuelQuota)));

    if (db) {
      await db.collection('vehicles').doc(vehicleId).update({
        fuelQuota: quota,
        lastQuotaAdjustment: {
          adjustedAt: new Date().toISOString(),
          newQuota: quota,
          reason
        }
      });
    }

    res.status(200).json({
      success: true,
      message: `Vehicle quota updated to ${quota}L by Administrator.`,
      data: { vehicleId, fuelQuota: quota }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/fuel/odd-even/:plateNumber - Check odd-even eligibility for today
 */
router.get('/odd-even/:plateNumber', (req, res) => {
  const { plateNumber } = req.params;
  const result = FuelService.isOddEvenEligible(plateNumber);

  res.status(200).json({
    success: true,
    data: result
  });
});

module.exports = router;
