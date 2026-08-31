const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { FuelService } = require('../services/fuelService');
const { EarningsService } = require('../services/earningsService');
const { validateBody } = require('../middleware/validate');

/**
 * GET /api/rides - Get all active rides (with filters: origin, destination, date)
 */
router.get('/', async (req, res, next) => {
  try {
    const { origin, destination, date } = req.query;

    if (!db) {
      return res.status(200).json({ success: true, data: [], count: 0 });
    }

    let query = db.collection('rides').where('status', '==', 'active');

    const snapshot = await query.get();
    let rides = [];

    snapshot.forEach(doc => {
      rides.push({ id: doc.id, ...doc.data() });
    });

    // In-memory filter for flexible matching (case-insensitive substring)
    if (origin) {
      const o = origin.toLowerCase().trim();
      rides = rides.filter(r => r.startLocation && r.startLocation.toLowerCase().includes(o));
    }
    if (destination) {
      const d = destination.toLowerCase().trim();
      rides = rides.filter(r => r.endLocation && r.endLocation.toLowerCase().includes(d));
    }
    if (date) {
      rides = rides.filter(r => r.date === date);
    }

    res.status(200).json({
      success: true,
      count: rides.length,
      data: rides
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/rides - Create new ride (with fuel validation)
 */
router.post('/', validateBody(['startLocation', 'endLocation', 'date', 'time', 'seats', 'price', 'plateNumber']), async (req, res, next) => {
  try {
    const {
      driverId,
      driverName,
      driverPhone,
      startLocation,
      endLocation,
      date,
      time,
      seats,
      price,
      plateNumber,
      vehicleModel,
      estimatedDistanceKm = 15.0
    } = req.body;

    // Fetch vehicle quota from database if vehicle exists
    let currentQuota = 30.0;
    if (db && plateNumber) {
      const vehSnap = await db.collection('vehicles').where('plateNumber', '==', plateNumber).limit(1).get();
      if (!vehSnap.empty) {
        currentQuota = vehSnap.docs[0].data().fuelQuota || 30.0;
      }
    }

    // Backend Business Logic: Fuel Quota & Odd-Even Restriction Verification
    const fuelValidation = FuelService.validateRideCreation(
      plateNumber,
      date,
      estimatedDistanceKm,
      currentQuota
    );

    if (!fuelValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: fuelValidation.error,
        code: fuelValidation.code,
        details: fuelValidation.details
      });
    }

    const rideData = {
      driverId: driverId || 'anonymous_driver',
      driverName: driverName || 'Driver',
      driverPhone: driverPhone || '',
      startLocation,
      endLocation,
      date,
      time,
      seats: parseInt(seats, 10),
      availableSeats: parseInt(seats, 10),
      price: parseFloat(price),
      plateNumber,
      vehicleModel: vehicleModel || 'Standard Car',
      estimatedDistanceKm: parseFloat(estimatedDistanceKm),
      estimatedFuelLiters: fuelValidation.fuelRequirement.fuelLiters,
      status: 'active',
      passengers: [],
      createdAt: new Date().toISOString()
    };

    let rideId = `ride_${Date.now()}`;
    if (db) {
      const docRef = await db.collection('rides').add(rideData);
      rideId = docRef.id;
    }

    res.status(201).json({
      success: true,
      message: 'Ride published successfully with fuel quota clearance',
      data: {
        id: rideId,
        ...rideData,
        fuelValidation
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/rides/:id - Get ride details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!db) {
      return res.status(200).json({ success: true, data: { id } });
    }

    const doc = await db.collection('rides').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found',
        code: 'RIDE_NOT_FOUND'
      });
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
 * PUT /api/rides/:id - Update ride status/details
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updatedAt: new Date().toISOString() };

    if (db) {
      await db.collection('rides').doc(id).update(updates);
    }

    res.status(200).json({
      success: true,
      message: 'Ride updated successfully',
      data: { id, ...updates }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/rides/:id - Cancel/delete ride
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (db) {
      await db.collection('rides').doc(id).update({
        status: 'cancelled',
        cancelledAt: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ride cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/rides/driver/:driverId - Get driver's rides
 */
router.get('/driver/:driverId', async (req, res, next) => {
  try {
    const { driverId } = req.params;
    if (!db) return res.status(200).json({ success: true, data: [], count: 0 });

    const snap = await db.collection('rides').where('driverId', '==', driverId).get();
    const rides = [];
    snap.forEach(doc => rides.push({ id: doc.id, ...doc.data() }));

    res.status(200).json({
      success: true,
      count: rides.length,
      data: rides
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/rides/passenger/:passengerId - Get passenger's bookings
 */
router.get('/passenger/:passengerId', async (req, res, next) => {
  try {
    const { passengerId } = req.params;
    if (!db) return res.status(200).json({ success: true, data: [], count: 0 });

    const snap = await db.collection('bookings').where('passengerId', '==', passengerId).get();
    const bookings = [];
    snap.forEach(doc => bookings.push({ id: doc.id, ...doc.data() }));

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/rides/:id/join - Passenger request to join ride
 */
router.post('/:id/join', validateBody(['passengerId', 'passengerName']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { passengerId, passengerName, passengerPhone, pickupLocation, seatsBooked = 1 } = req.body;

    if (!db) {
      return res.status(200).json({ success: true, message: 'Join request registered' });
    }

    const rideRef = db.collection('rides').doc(id);
    const rideDoc = await rideRef.get();

    if (!rideDoc.exists) {
      return res.status(404).json({ success: false, error: 'Ride not found', code: 'RIDE_NOT_FOUND' });
    }

    const rideData = rideDoc.data();
    if (rideData.availableSeats < seatsBooked) {
      return res.status(400).json({
        success: false,
        error: 'No seats available for this ride.',
        code: 'SEATS_UNAVAILABLE'
      });
    }

    const bookingRef = await db.collection('bookings').add({
      rideId: id,
      driverId: rideData.driverId,
      passengerId,
      passengerName,
      passengerPhone: passengerPhone || '',
      pickupLocation: pickupLocation || rideData.startLocation,
      destination: rideData.endLocation,
      fare: (rideData.price || 0) * seatsBooked,
      seatsBooked: parseInt(seatsBooked, 10),
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Booking request sent to driver',
      data: {
        bookingId: bookingRef.id,
        rideId: id,
        status: 'pending'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/rides/:id/accept - Driver accept passenger
 */
router.post('/:id/accept', validateBody(['bookingId']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { bookingId } = req.body;

    if (db) {
      await db.collection('bookings').doc(bookingId).update({
        status: 'accepted',
        acceptedAt: new Date().toISOString()
      });

      // Decrement available seats
      const rideRef = db.collection('rides').doc(id);
      const rideDoc = await rideRef.get();
      if (rideDoc.exists) {
        const available = Math.max(0, (rideDoc.data().availableSeats || 1) - 1);
        await rideRef.update({ availableSeats: available });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Passenger booking accepted. In-app chat is now enabled for this trip.',
      data: { rideId: id, bookingId, status: 'accepted' }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/rides/:id/reject - Driver reject passenger
 */
router.post('/:id/reject', validateBody(['bookingId']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { bookingId, reason } = req.body;

    if (db) {
      await db.collection('bookings').doc(bookingId).update({
        status: 'rejected',
        rejectionReason: reason || 'Seats unavailable',
        rejectedAt: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Passenger booking request rejected',
      data: { rideId: id, bookingId, status: 'rejected' }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/rides/:id/complete - Complete ride with fuel deduction & revenue split
 */
router.post('/:id/complete', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { actualDistanceKm = 15.0, totalFareCollected = 800.0, isOwnerDriver = true, ownerPercentage = 70 } = req.body;

    let rideData = {};
    if (db) {
      const rideDoc = await db.collection('rides').doc(id).get();
      if (rideDoc.exists) rideData = rideDoc.data();
    }

    const dist = parseFloat(actualDistanceKm) || rideData.estimatedDistanceKm || 15.0;
    const fare = parseFloat(totalFareCollected) || rideData.price || 800.0;

    // 1. Calculate Fuel Deduction
    const fuelCalc = FuelService.calculateFuelConsumption(dist);

    // 2. Calculate Revenue Split
    const earnings = EarningsService.calculateSplit(fare, isOwnerDriver, ownerPercentage);

    // 3. Update Database records
    if (db) {
      await db.collection('rides').doc(id).update({
        status: 'completed',
        completedAt: new Date().toISOString(),
        actualDistanceKm: dist,
        fuelBurnedLiters: fuelCalc.fuelLiters,
        earningsBreakdown: earnings
      });

      // Deduct quota from vehicle
      if (rideData.plateNumber) {
        const vehSnap = await db.collection('vehicles').where('plateNumber', '==', rideData.plateNumber).limit(1).get();
        if (!vehSnap.empty) {
          const vehDoc = vehSnap.docs[0];
          const curQ = vehDoc.data().fuelQuota || 30.0;
          const newQ = Math.max(0, curQ - fuelCalc.fuelLiters);
          await vehDoc.ref.update({ fuelQuota: parseFloat(newQ.toFixed(2)) });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Ride completed successfully. Fuel quota deducted and earnings allocated.',
      data: {
        rideId: id,
        status: 'completed',
        fuelDeduction: fuelCalc,
        earningsBreakdown: earnings
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
