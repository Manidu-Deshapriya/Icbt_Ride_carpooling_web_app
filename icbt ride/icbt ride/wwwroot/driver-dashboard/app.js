// ============================================================================
// ICBT Ride - Driver Dashboard Controller (app.js)
// Real-time Firebase synchronization for Driver operations
// ============================================================================

// Global DB and Storage instances
const db = window.db || (firebase.apps.length ? firebase.firestore() : null);
const storage = firebase.storage ? firebase.storage() : null;

// Helper: Safely get logged-in driver session
function getLoggedInDriver() {
    try {
        const driverRaw = localStorage.getItem('loggedInUser_driver');
        if (driverRaw) return JSON.parse(driverRaw);
        const raw = localStorage.getItem('loggedInUser');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.role === 'driver') return parsed;
        }
        const legacyId = localStorage.getItem('loggedInUserId');
        const legacyRole = localStorage.getItem('loggedInUserRole');
        if (legacyId && legacyRole === 'driver') return { uid: legacyId, name: 'Driver', role: 'driver' };
    } catch (e) {
        console.error("Error reading session:", e);
    }
    return null;
}

// Ensure global modal styles are injected for all driver dashboard pages
function ensureDriverModalStyles() {
    if (!document.getElementById('driver-custom-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'driver-custom-modal-styles';
        style.innerHTML = `
            .driver-custom-modal-overlay {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(0, 0, 0, 0.65) !important;
                backdrop-filter: blur(8px) !important;
                -webkit-backdrop-filter: blur(8px) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                z-index: 99999999 !important;
                opacity: 0 !important;
                pointer-events: none !important;
                transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
                padding: 16px !important;
                box-sizing: border-box !important;
                margin: 0 !important;
            }
            .driver-custom-modal-overlay.active {
                opacity: 1 !important;
                pointer-events: all !important;
            }
            .driver-custom-modal-card {
                background: #ffffff !important;
                border-radius: 24px !important;
                width: 100% !important;
                max-width: 400px !important;
                padding: 28px 24px !important;
                box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05) !important;
                text-align: center !important;
                transform: scale(0.88) translateY(12px) !important;
                transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
                box-sizing: border-box !important;
                margin: auto !important;
            }
            .driver-custom-modal-overlay.active .driver-custom-modal-card {
                transform: scale(1) translateY(0) !important;
            }
            .driver-modal-icon-wrap {
                width: 68px;
                height: 68px;
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 2rem;
                margin-bottom: 16px;
            }
            .driver-modal-icon-wrap.confirm {
                background: #e8f5e9;
                color: #1b5e20;
            }
            .driver-modal-icon-wrap.success {
                background: #e8f5e9;
                color: #2e7d32;
            }
            .driver-modal-title {
                font-size: 1.35rem !important;
                font-weight: 700 !important;
                color: #1e293b !important;
                margin: 0 0 10px 0 !important;
                font-family: inherit !important;
            }
            .driver-modal-msg {
                font-size: 0.95rem !important;
                color: #64748b !important;
                margin: 0 0 24px 0 !important;
                line-height: 1.55 !important;
                font-family: inherit !important;
            }
            .driver-modal-actions {
                display: flex !important;
                gap: 12px !important;
                justify-content: center !important;
            }
            .driver-modal-btn-cancel {
                flex: 1 !important;
                padding: 12px 18px !important;
                border-radius: 12px !important;
                border: 1px solid #e2e8f0 !important;
                background: #f1f5f9 !important;
                color: #475569 !important;
                font-weight: 600 !important;
                font-size: 0.95rem !important;
                cursor: pointer !important;
                transition: background 0.2s, transform 0.1s !important;
            }
            .driver-modal-btn-cancel:hover {
                background: #e2e8f0 !important;
            }
            .driver-modal-btn-confirm {
                flex: 1 !important;
                padding: 12px 18px !important;
                border-radius: 12px !important;
                border: none !important;
                background: #1b5e20 !important;
                color: #ffffff !important;
                font-weight: 600 !important;
                font-size: 0.95rem !important;
                cursor: pointer !important;
                box-shadow: 0 4px 14px rgba(27, 94, 32, 0.3) !important;
                transition: background 0.2s, transform 0.1s, box-shadow 0.2s !important;
            }
            .driver-modal-btn-confirm:hover {
                background: #144717 !important;
                box-shadow: 0 6px 18px rgba(27, 94, 32, 0.4) !important;
            }
            .driver-modal-btn-confirm:active, .driver-modal-btn-cancel:active {
                transform: scale(0.98) !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// Global modal helper for Success
window.showSuccessModal = function(title, message) {
    ensureDriverModalStyles();
    
    let modal = document.getElementById('driverCustomSuccessModal');
    if (!modal) {
        const modalHtml = `
        <div class="driver-custom-modal-overlay" id="driverCustomSuccessModal">
            <div class="driver-custom-modal-card">
                <div class="driver-modal-icon-wrap success">
                    <i class="fa-solid fa-circle-check"></i>
                </div>
                <h3 class="driver-modal-title" id="driverCustomSuccessTitle">Success!</h3>
                <p class="driver-modal-msg" id="driverCustomSuccessMessage">Action completed successfully.</p>
                <div class="driver-modal-actions">
                    <button class="driver-modal-btn-confirm" id="driverCustomSuccessDone" style="flex: 1;">Done</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modal = document.getElementById('driverCustomSuccessModal');
        
        document.getElementById('driverCustomSuccessDone').addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    const titleEl = document.getElementById('driverCustomSuccessTitle');
    const msgEl = document.getElementById('driverCustomSuccessMessage');
    if (titleEl) titleEl.innerText = title || 'Success!';
    if (msgEl) msgEl.innerText = message || 'Action completed successfully.';

    modal.classList.add('active');
};

// Global Custom Confirm Modal Helper
window.customConfirmDriver = function(title, message) {
    ensureDriverModalStyles();
    
    return new Promise((resolve) => {
        let modal = document.getElementById('driverCustomConfirmModal');
        if (!modal) {
            const modalHtml = `
            <div class="driver-custom-modal-overlay" id="driverCustomConfirmModal">
                <div class="driver-custom-modal-card">
                    <div class="driver-modal-icon-wrap confirm">
                        <i class="fa-solid fa-circle-question"></i>
                    </div>
                    <h3 class="driver-modal-title" id="driverCustomConfirmTitle">Confirm</h3>
                    <p class="driver-modal-msg" id="driverCustomConfirmMessage">Are you sure?</p>
                    <div class="driver-modal-actions">
                        <button class="driver-modal-btn-cancel" id="driverCustomConfirmCancel">Cancel</button>
                        <button class="driver-modal-btn-confirm" id="driverCustomConfirmOk">Yes, Continue</button>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modal = document.getElementById('driverCustomConfirmModal');
        }

        document.getElementById('driverCustomConfirmTitle').innerText = title || 'Confirm';
        document.getElementById('driverCustomConfirmMessage').innerText = message || 'Are you sure?';
        
        modal.classList.add('active');

        const btnOk = document.getElementById('driverCustomConfirmOk');
        const btnCancel = document.getElementById('driverCustomConfirmCancel');

        const handleOk = () => {
            modal.classList.remove('active');
            cleanup();
            resolve(true);
        };

        const handleCancel = () => {
            modal.classList.remove('active');
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            btnOk.removeEventListener('click', handleOk);
            btnCancel.removeEventListener('click', handleCancel);
        };

        btnOk.addEventListener('click', handleOk);
        btnCancel.addEventListener('click', handleCancel);
    });
};

// Document Admin Contact Helper
function contactAdminForDocs(docName) {
    alert(`Please contact the Administrator to update your ${docName}. Verified documents cannot be changed directly for security reasons.`);
}

// Cancel an active ride
async function cancelRide(rideId) {
    const isConfirmed = await window.customConfirmDriver('Cancel Ride?', 'Are you sure you want to cancel this ride? Passengers with bookings will be notified and refunded.');
    if (!isConfirmed) return;
    try {
        const rideDoc = await db.collection('rides').doc(rideId).get();
        const rideData = rideDoc.exists ? rideDoc.data() : {};

        await db.collection('rides').doc(rideId).update({
            status: 'cancelled',
            cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update all passenger bookings for this ride and process refunds
        const bookingSnap = await db.collection('bookings').where('rideId', '==', rideId).get();
        const batch = db.batch();

        for (const bDoc of bookingSnap.docs) {
            const bData = bDoc.data();
            if (bData.status !== 'Cancelled' && bData.status !== 'cancelled') {
                batch.update(bDoc.ref, {
                    status: 'Cancelled',
                    cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Refund passenger wallet if paid
                const refundAmt = Number(bData.amount) || 0;
                if (bData.passengerId && refundAmt > 0) {
                    const passRef = db.collection('users').doc(bData.passengerId);
                    batch.update(passRef, {
                        walletBalance: firebase.firestore.FieldValue.increment(refundAmt)
                    });
                }

                // Send live notification to passenger
                if (bData.passengerId) {
                    const notifRef = db.collection('notifications').doc();
                    batch.set(notifRef, {
                        userId: bData.passengerId,
                        title: "Ride Cancelled by Driver",
                        message: `Your ride from ${bData.rideFrom || rideData.start || 'Origin'} to ${bData.rideTo || rideData.dest || 'Destination'} was cancelled by the driver. Any fare paid (Rs. ${refundAmt}) has been refunded to your wallet.`,
                        type: "ride_cancelled",
                        rideId: rideId,
                        read: false,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        }

        await batch.commit();
        showSuccessModal('Ride Cancelled', 'The ride has been cancelled. All passenger bookings have been updated and refunded.');
    } catch (error) {
        console.error('Error cancelling ride:', error);
        alert('Failed to cancel ride. Please check connection.');
    }
}

// Calculate Ride Earnings based on owner assignment & bookings
async function calculateRideEarnings(rideId) {
    try {
        const rideDoc = await db.collection('rides').doc(rideId).get();
        if (!rideDoc.exists) throw new Error("Ride not found");
        const ride = rideDoc.data();

        // 1. Fetch total booking payments made by passengers for this ride
        const bookingSnap = await db.collection('bookings')
            .where('rideId', '==', rideId)
            .get();

        let totalFare = 0;
        let passengerCount = 0;
        bookingSnap.forEach(bDoc => {
            const bData = bDoc.data();
            if (bData.status !== 'Cancelled' && bData.status !== 'cancelled') {
                totalFare += Number(bData.amount || ride.price || 350);
                passengerCount++;
            }
        });

        // Default to base fare if no bookings recorded yet
        if (totalFare === 0) {
            totalFare = Number(ride.price || 350);
        }

        const isOwnerDriver = !ride.ownerId || ride.ownerId === ride.driverId;
        const driverSharePercent = isOwnerDriver ? 100 : Number(ride.driverSharePercent || 70);
        const ownerSharePercent = isOwnerDriver ? 0 : Number(ride.ownerSharePercent || 30);

        const driverEarnings = Math.round(totalFare * driverSharePercent / 100);
        const ownerEarnings = Math.round(totalFare * ownerSharePercent / 100);

        return {
            totalFare,
            driverEarnings,
            ownerEarnings,
            passengerCount,
            isOwnerDriver,
            driverSharePercent,
            ownerSharePercent,
            ownerId: ride.ownerId,
            plateNumber: ride.plateNumber || ride.vehicle || 'Vehicle',
            vehicleId: ride.vehicleId
        };
    } catch (err) {
        console.error("Error calculating earnings:", err);
        return { totalFare: 350, driverEarnings: 350, ownerEarnings: 0, passengerCount: 1, isOwnerDriver: true };
    }
}

// Complete ride with automated revenue split, fuel deduction & wallet updates
async function completeRide(rideId) {
    const isConfirmed = await window.customConfirmDriver('Complete Ride?', 'Mark this ride as completed? Earnings will be credited to your wallet and fuel consumed will be recorded.');
    if (!isConfirmed) return;
    try {
        const earnings = await calculateRideEarnings(rideId);
        const driver = getLoggedInDriver();

        // Fetch ride details to calculate fuel consumption
        const rideDoc = await db.collection('rides').doc(rideId).get();
        const rideData = rideDoc.exists ? rideDoc.data() : {};
        const distanceKm = Number(rideData.distanceKm) || (window.FuelQuotaEngine ? window.FuelQuotaEngine.estimateDistance(rideData.start, rideData.dest) : 15.0);
        const fuelNeeded = Number(rideData.fuelNeeded) || (window.FuelQuotaEngine ? window.FuelQuotaEngine.calculateFuelNeeded(distanceKm) : (distanceKm * 0.08));
        const fuelCostLkr = Number(rideData.fuelCostLkr) || Math.round(fuelNeeded * 320);

        // 1. Update Ride Document
        await db.collection('rides').doc(rideId).update({
            status: 'completed',
            totalFare: earnings.totalFare,
            driverEarnings: earnings.driverEarnings,
            ownerEarnings: earnings.ownerEarnings,
            driverSharePercent: earnings.driverSharePercent,
            ownerSharePercent: earnings.ownerSharePercent,
            distanceKm: distanceKm,
            fuelConsumed: fuelNeeded,
            fuelCost: fuelCostLkr,
            completedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Mark all passenger bookings as 'completed' and notify each passenger in real-time
        const bookingSnap = await db.collection('bookings').where('rideId', '==', rideId).get();
        const batch = db.batch();

        for (const bDoc of bookingSnap.docs) {
            const bData = bDoc.data();
            if (bData.status !== 'Cancelled' && bData.status !== 'cancelled') {
                batch.update(bDoc.ref, {
                    status: 'completed',
                    completedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                if (bData.passengerId) {
                    const notifRef = db.collection('notifications').doc();
                    batch.set(notifRef, {
                        userId: bData.passengerId,
                        title: "🎉 You Have Arrived!",
                        message: `Your ride from ${bData.rideFrom || rideData.start || 'Origin'} to ${bData.rideTo || rideData.dest || 'Destination'} has reached destination and is completed. Thank you for riding with ICBT Ride!`,
                        type: "ride_completed",
                        rideId: rideId,
                        amount: Number(bData.amount || rideData.price || 350),
                        driverName: driver?.name || 'Driver',
                        read: false,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        }
        await batch.commit();

        // 3. Credit Driver's Wallet
        if (driver && driver.uid) {
            const driverRef = db.collection('users').doc(driver.uid);
            await driverRef.update({
                walletBalance: firebase.firestore.FieldValue.increment(earnings.driverEarnings),
                totalEarnings: firebase.firestore.FieldValue.increment(earnings.driverEarnings),
                totalRides: firebase.firestore.FieldValue.increment(1)
            });

            // Update session
            const userRaw = localStorage.getItem('loggedInUser');
            if (userRaw) {
                const userObj = JSON.parse(userRaw);
                userObj.totalEarnings = (userObj.totalEarnings || 0) + earnings.driverEarnings;
                userObj.walletBalance = (userObj.walletBalance || 0) + earnings.driverEarnings;
                localStorage.setItem('loggedInUser', JSON.stringify(userObj));
                localStorage.setItem('loggedInUser_driver', JSON.stringify(userObj));
            }
        }

        // 4. If hired driver under an Owner, credit Owner's Wallet
        if (!earnings.isOwnerDriver && earnings.ownerId) {
            const ownerRef = db.collection('users').doc(earnings.ownerId);
            await ownerRef.update({
                walletBalance: firebase.firestore.FieldValue.increment(earnings.ownerEarnings),
                totalEarnings: firebase.firestore.FieldValue.increment(earnings.ownerEarnings)
            });

            // Send notification to Owner
            await db.collection('notifications').add({
                userId: earnings.ownerId,
                title: "Ride Completed & Payout Received",
                message: `Ride on vehicle ${earnings.plateNumber} completed. Your ${earnings.ownerSharePercent}% revenue share (Rs. ${earnings.ownerEarnings}) has been credited.`,
                type: "owner_ride_payout",
                rideId: rideId,
                amount: earnings.ownerEarnings,
                read: false,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // 5. Update Vehicle Performance Stats & Deduct Fuel Quota
        if (earnings.vehicleId) {
            const vRef = db.collection('vehicles').doc(earnings.vehicleId);
            const vSnap = await vRef.get();
            let currentRemaining = 30.0;
            if (vSnap.exists) {
                const vData = vSnap.data();
                currentRemaining = Number(vData.remainingQuota !== undefined ? vData.remainingQuota : 30.0);
            }
            const newRemaining = Math.max(0, parseFloat((currentRemaining - fuelNeeded).toFixed(2)));

            await vRef.update({
                totalRides: firebase.firestore.FieldValue.increment(1),
                totalEarnings: firebase.firestore.FieldValue.increment(earnings.totalFare),
                totalPassengers: firebase.firestore.FieldValue.increment(earnings.passengerCount || 1),
                remainingQuota: newRemaining,
                fuelUsedThisMonth: firebase.firestore.FieldValue.increment(fuelNeeded)
            }).catch(() => {});

            // Record Fuel Consumption Log
            await db.collection('fuel_logs').add({
                vehicleId: earnings.vehicleId,
                plateNumber: earnings.plateNumber,
                driverId: driver?.uid || '',
                driverName: driver?.name || 'Driver',
                type: 'ride_consumption',
                liters: fuelNeeded,
                costLkr: fuelCostLkr,
                distanceKm: distanceKm,
                remainingQuotaAfter: newRemaining,
                rideId: rideId,
                note: `Ride from ${rideData.start || 'Origin'} to ${rideData.dest || 'Destination'}`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(() => {});

            // Low Quota Alert Notification (< 20% / 6 Liters)
            if (newRemaining < 6.0 && driver?.uid) {
                await db.collection('notifications').add({
                    userId: driver.uid,
                    title: "Low Fuel Quota Warning",
                    message: `Vehicle ${earnings.plateNumber} has only ${newRemaining} L remaining (${Math.round((newRemaining/30)*100)}%). Please refuel on eligible Odd/Even dates.`,
                    type: "low_fuel_quota",
                    read: false,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(() => {});
            }
        }

        showSuccessModal('Trip Completed & Earnings Credited! 🎉', `Great job! Your earnings of Rs. ${earnings.driverEarnings.toLocaleString()} have been credited to your driver wallet. Total fare collected: Rs. ${earnings.totalFare.toLocaleString()}.`);
    } catch (error) {
        console.error('Error completing ride with earnings & fuel:', error);
        alert('Failed to complete ride.');
    }
}

// Complete drop-off for an individual booked passenger on this trip
async function completePassengerDropoff(bookingId, rideId) {
    if (!bookingId) return;
    const bDocRef = db.collection('bookings').doc(bookingId);
    const bSnap = await bDocRef.get();
    if (!bSnap.exists) {
        alert("Booking not found.");
        return;
    }
    const bData = bSnap.data();
    const pName = bData.passengerName || 'Passenger';
    const amount = Number(bData.amount || 350);

    const isConfirmed = await window.customConfirmDriver(
        `Complete Drop-off for ${pName}?`,
        `Mark this passenger's drop-off as completed? Fare of Rs. ${amount} will be finalized and credited.`
    );
    if (!isConfirmed) return;

    try {
        const driver = getLoggedInDriver();

        // 1. Mark booking as completed
        await bDocRef.update({
            status: 'completed',
            completedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Notify the passenger with arrival celebration
        if (bData.passengerId) {
            await db.collection('notifications').add({
                userId: bData.passengerId,
                title: "🎉 You Have Arrived!",
                message: `Your ride to ${bData.rideTo || 'Destination'} is completed. Thank you for riding with ICBT Ride!`,
                type: "ride_completed",
                rideId: rideId || '',
                amount: amount,
                driverName: driver?.name || 'Driver',
                read: false,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // 3. Credit Driver's Wallet for this passenger
        if (driver && driver.uid) {
            const driverRef = db.collection('users').doc(driver.uid);
            await driverRef.update({
                walletBalance: firebase.firestore.FieldValue.increment(amount),
                totalEarnings: firebase.firestore.FieldValue.increment(amount)
            });

            // Update session
            const userRaw = localStorage.getItem('loggedInUser');
            if (userRaw) {
                const userObj = JSON.parse(userRaw);
                userObj.totalEarnings = (userObj.totalEarnings || 0) + amount;
                userObj.walletBalance = (userObj.walletBalance || 0) + amount;
                localStorage.setItem('loggedInUser', JSON.stringify(userObj));
                localStorage.setItem('loggedInUser_driver', JSON.stringify(userObj));
            }
        }

        showSuccessModal(
            'Drop-off Completed! 🏁',
            `Drop-off completed for ${pName}. Rs. ${amount} has been credited to your driver wallet.`
        );
    } catch (error) {
        console.error("Error completing passenger dropoff:", error);
        alert("Could not complete drop-off.");
    }
}
window.completePassengerDropoff = completePassengerDropoff;

// Accept a custom passenger ride request
async function acceptRequest(reqId) {
    const driver = getLoggedInDriver();
    if (!driver || !driver.uid) {
        alert('Please log in first.');
        return;
    }

    const isConfirmed = await window.customConfirmDriver('Accept Request?', 'Are you sure you want to accept this passenger request?');
    if (!isConfirmed) return;

    try {
        const reqRef = db.collection('RideRequests').doc(reqId);
        const doc = await reqRef.get();
        if (!doc.exists) {
            // Check legacy collection
            const legRef = db.collection('requests').doc(reqId);
            const legDoc = await legRef.get();
            if (!legDoc.exists) throw new Error('Request not found');
            await legRef.update({ status: 'accepted', driverId: driver.uid, driverName: driver.name || 'Driver' });
            showSuccessModal('Request Accepted', 'Passenger has been notified.');
            return;
        }

        const data = doc.data();

        // 20-Minute Expiration Validation Check
        const now = Date.now();
        const expiresAt = data.expiresAt || (data.createdAtMs ? data.createdAtMs + 20*60*1000 : (data.timestamp?.toMillis ? data.timestamp.toMillis() + 20*60*1000 : null));
        if (data.status === 'expired' || (expiresAt && now > expiresAt)) {
            await reqRef.update({ status: 'expired' }).catch(() => {});
            alert("⏰ This ride request has expired after 20 minutes and can no longer be accepted.");
            return;
        }

        await reqRef.update({
            status: 'accepted',
            driverId: driver.uid,
            driverName: driver.name || 'Driver',
            driverPhone: driver.phone || '',
            acceptedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Notify Passenger
        if (data.passengerId) {
            await db.collection('notifications').add({
                userId: data.passengerId,
                title: "Ride Request Accepted! 🚗",
                message: `Driver ${driver.name || 'A driver'} has accepted your ride request from ${data.origin || 'Origin'} to ${data.destination || 'Destination'}.`,
                type: "request_accepted",
                requestId: reqId,
                driverId: driver.uid,
                read: false,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // Initialize Chat Document
        const chatId = `${reqId}_${data.passengerId || 'pass'}_${driver.uid}`;
        await db.collection('chats').doc(chatId).set({
            requestId: reqId,
            passengerId: data.passengerId || 'unknown',
            passengerName: data.passengerName || 'Passenger',
            driverId: driver.uid,
            driverName: driver.name || 'Driver',
            lastMessage: 'Ride Request Accepted',
            lastTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            unread_passenger: 0,
            unread_driver: 0
        }, { merge: true });

        // Add notification for passenger
        if (data.passengerId) {
            await db.collection('notifications').add({
                userId: data.passengerId,
                title: 'Request Accepted',
                message: `Driver ${driver.name || 'a driver'} accepted your ride request from ${data.origin || 'origin'} to ${data.destination || 'destination'}.`,
                read: false,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        showSuccessModal('Request Accepted', 'You have accepted this passenger request. Opening chat with passenger...');
        
        // Auto-open chat
        setTimeout(() => {
            if (window.openDirectChat && data.passengerId) {
                window.openDirectChat(data.passengerId, data.passengerName || 'Passenger', chatId);
            }
        }, 1200);
    } catch (error) {
        console.error('Error accepting request:', error);
        alert('Failed to accept request.');
    }
}

// Reject a custom request
async function rejectRequest(reqId) {
    const isConfirmed = await window.customConfirmDriver('Decline Request?', 'Are you sure you want to decline this request?');
    if (!isConfirmed) return;
    
    try {
        await db.collection('RideRequests').doc(reqId).update({
            status: 'rejected',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showSuccessModal('Request Declined', 'The request has been updated.');
    } catch (error) {
        console.error('Error rejecting request:', error);
    }
}

// Complete custom passenger request with wallet credit & passenger notification
window.completeCustomRequest = async function(reqId) {
    const isConfirmed = await window.customConfirmDriver('Complete Trip?', 'Are you sure you want to mark this custom passenger trip as completed? Fare earnings will be credited to your wallet.');
    if (!isConfirmed) return;

    try {
        const reqDoc = await db.collection('RideRequests').doc(reqId).get();
        const reqData = reqDoc.exists ? reqDoc.data() : {};
        const driver = getLoggedInDriver();
        const fareAmount = Number(reqData.amount || reqData.fare || reqData.price || 350);

        await db.collection('RideRequests').doc(reqId).update({
            status: 'completed',
            completedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 1. Credit driver wallet
        if (driver && driver.uid) {
            await db.collection('users').doc(driver.uid).update({
                walletBalance: firebase.firestore.FieldValue.increment(fareAmount),
                totalEarnings: firebase.firestore.FieldValue.increment(fareAmount),
                totalRides: firebase.firestore.FieldValue.increment(1)
            });

            const userRaw = localStorage.getItem('loggedInUser');
            if (userRaw) {
                const userObj = JSON.parse(userRaw);
                userObj.totalEarnings = (userObj.totalEarnings || 0) + fareAmount;
                userObj.walletBalance = (userObj.walletBalance || 0) + fareAmount;
                localStorage.setItem('loggedInUser', JSON.stringify(userObj));
                localStorage.setItem('loggedInUser_driver', JSON.stringify(userObj));
            }
        }

        // 2. Send live completion notification to Passenger
        if (reqData.passengerId) {
            await db.collection('notifications').add({
                userId: reqData.passengerId,
                title: "🎉 You Have Arrived!",
                message: `Your scheduled ride from ${reqData.origin || 'Origin'} to ${reqData.destination || 'Destination'} has reached destination and is completed. Thank you for riding with ICBT Ride!`,
                type: "ride_completed",
                requestId: reqId,
                amount: fareAmount,
                driverName: driver?.name || reqData.driverName || 'Driver',
                read: false,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        showSuccessModal('Custom Trip Completed! 🎉', `The custom trip has been completed! Rs. ${fareAmount.toLocaleString()} has been credited to your driver wallet balance.`);
    } catch (error) {
        console.error('Error completing custom request:', error);
        alert('Failed to complete custom trip.');
    }
};

// Helper to open chat widget directly with a specific user
function openChatForPassenger(passengerId, passengerName, chatId) {
    if (window.openDirectChat) {
        window.openDirectChat(passengerId, passengerName, chatId);
    } else {
        const btn = document.getElementById('chat-widget-btn');
        if (btn) btn.click();
    }
}

// ----------------------------------------------------------------------------
// MAIN INITIALIZATION
// ----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = getLoggedInDriver();

    // If not logged in, redirect to login page
    if (!currentUser || !currentUser.uid) {
        console.warn("No active driver session found. Redirecting to login...");
        window.location.href = '/main-login/login.html';
        return;
    }

    // --- 1. Header & Avatar Rendering ---
    function updateAvatarAndHeader(userData) {
        const name = userData.name || userData.fullName || currentUser.name || 'Driver';
        const firstName = name.split(' ')[0];
        const profilePic = userData.profileImageUrl || userData.profilePicUrl || currentUser.profileImageUrl || currentUser.profilePicUrl || '';

        // Update Greeting
        const greetEl = document.getElementById('greeting');
        if (greetEl) greetEl.innerText = `Hello, ${firstName}`;

        // Update Profile Name
        const nameEl = document.getElementById('profileName');
        if (nameEl) nameEl.innerText = name;

        // Update Verification Badge
        const statusEl = document.getElementById('driverStatus');
        if (statusEl) {
            const isVerified = (userData.status === 'verified') || (userData.drivingLicenseStatus && userData.drivingLicenseStatus.includes('Verified'));
            if (isVerified) {
                statusEl.innerHTML = '<span style="color: var(--success-color); font-weight: 500;"><i class="fa-solid fa-circle-check"></i> Verified Driver</span>';
            } else {
                statusEl.innerHTML = '<span style="color: var(--text-muted); font-weight: 500;"><i class="fa-solid fa-shield-halved"></i> Active Driver</span>';
            }
        }

        // Update Avatar Image / Initials
        const avatarEl = document.getElementById('avatarInitials');
        if (avatarEl) {
            if (profilePic && profilePic.trim() !== '') {
                avatarEl.innerHTML = `<img src="${profilePic}" alt="${name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                avatarEl.style.background = 'transparent';
                avatarEl.style.overflow = 'hidden';
            } else {
                avatarEl.innerText = name.charAt(0).toUpperCase();
                avatarEl.style.background = 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))';
                avatarEl.style.color = '#fff';
            }
        }
    }

    // Initial render from local session
    updateAvatarAndHeader(currentUser);

    // --- 2. Real-time User Profile & Vehicle Sync ---
    db.collection('users').doc(currentUser.uid).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            
            // Sync session
            const updatedUser = { ...currentUser, ...data };
            localStorage.setItem('loggedInUser', JSON.stringify(updatedUser));
            localStorage.setItem('loggedInUser_driver', JSON.stringify(updatedUser));
            
            // Update Header & Avatar
            updateAvatarAndHeader(data);

            // Dashboard Vehicle & Profile Widget
            const dashVehicle = document.getElementById('vehicleModel');
            const dashPlate = document.getElementById('plateNumber');
            const dashSeats = document.getElementById('availableSeats');
            const dashLicStatus = document.getElementById('licenseStatus');
            const dashRegStatus = document.getElementById('vehicleRegStatus');

            if (dashVehicle) dashVehicle.innerText = data.vehicleModel || '--';
            if (dashPlate) dashPlate.innerText = data.plateNumber || data.vehiclePlate || '--';
            if (dashSeats) dashSeats.innerText = data.availableSeats || '3';

            if (dashLicStatus) {
                if (data.drivingLicenseUrl) {
                    dashLicStatus.innerHTML = '<i class="fa-solid fa-check"></i> Uploaded';
                    dashLicStatus.style.background = 'rgba(16, 185, 129, 0.15)';
                    dashLicStatus.style.color = 'var(--success-color)';
                } else {
                    dashLicStatus.innerHTML = 'Pending';
                    dashLicStatus.style.background = 'rgba(239, 68, 68, 0.1)';
                    dashLicStatus.style.color = 'var(--danger-color)';
                }
            }

            if (dashRegStatus) {
                if (data.vehicleRegUrl) {
                    dashRegStatus.innerHTML = '<i class="fa-solid fa-check"></i> Uploaded';
                    dashRegStatus.style.background = 'rgba(16, 185, 129, 0.15)';
                    dashRegStatus.style.color = 'var(--success-color)';
                } else {
                    dashRegStatus.innerHTML = 'Pending';
                    dashRegStatus.style.background = 'rgba(239, 68, 68, 0.1)';
                    dashRegStatus.style.color = 'var(--danger-color)';
                }
            }

            // Profile Page Form Inputs (profile.html)
            const inputName = document.getElementById('profileFullName');
            const inputPhone = document.getElementById('profilePhone');
            const inputVehicle = document.getElementById('profileVehicle');
            const inputPlate = document.getElementById('profilePlate');

            if (inputName && !inputName.value) inputName.value = data.name || data.fullName || '';
            if (inputPhone && !inputPhone.value) inputPhone.value = data.phone || data.phoneNumber || '';
            if (inputVehicle && !inputVehicle.value) inputVehicle.value = data.vehicleModel || '';
            if (inputPlate && !inputPlate.value) inputPlate.value = data.plateNumber || '';

            // Document Status UI on profile.html
            const dlStatusEl = document.getElementById('dlStatus');
            const vrStatusEl = document.getElementById('vrStatus');

            if (dlStatusEl) {
                if (data.drivingLicenseUrl) {
                    dlStatusEl.innerHTML = `<span style="color: var(--success-color); font-weight: 500;"><i class="fa-solid fa-circle-check"></i> Document uploaded & verified</span>`;
                } else {
                    dlStatusEl.innerText = 'Please upload a clear picture.';
                }
            }

            const avatarStatusEl = document.getElementById('avatarStatus');
            if (avatarStatusEl && data.profilePicUrl) {
                avatarStatusEl.innerHTML = `<span style="color: var(--success-color); font-weight: 500;"><i class="fa-solid fa-circle-check"></i> Profile photo uploaded</span>`;
            }

            if (vrStatusEl) {
                if (data.vehicleRegUrl) {
                    vrStatusEl.innerHTML = `<span style="color: var(--success-color); font-weight: 500;"><i class="fa-solid fa-circle-check"></i> Official registration on file</span>`;
                } else {
                    vrStatusEl.innerText = 'Please upload the official document.';
                }
            }
        }
    }, (err) => console.error("Error fetching user profile:", err));

    // --- 3. Fuel Quota & Odd-Even Engine & Driver Vehicles Integration ---
    let driverAvailableVehicles = [];
    let activeVehicleUnsub = null;
    let currentValidatedRideData = null;

    const offerVehicleSelect = document.getElementById('offerVehicleSelect');
    const vehicleSplitBadge = document.getElementById('vehicleSplitBadge');
    const offerSeatsInput = document.getElementById('offerSeats');
    const offerDateInput = document.getElementById('offerDate');

    // Fuel Status Card DOM Elements
    const fuelVehiclePlateBadge = document.getElementById('fuelVehiclePlateBadge');
    const fuelStatusVehicleName = document.getElementById('fuelStatusVehicleName');
    const fuelStatusTodayDate = document.getElementById('fuelStatusTodayDate');
    const fuelEligibilityIndicator = document.getElementById('fuelEligibilityIndicator');
    const fuelQuotaRemainingText = document.getElementById('fuelQuotaRemainingText');
    const fuelQuotaPercentageText = document.getElementById('fuelQuotaPercentageText');
    const fuelQuotaProgressBar = document.getElementById('fuelQuotaProgressBar');
    const fuelUsedThisMonthText = document.getElementById('fuelUsedThisMonthText');
    const fuelEstimatedRidesLeftText = document.getElementById('fuelEstimatedRidesLeftText');
    const fuelLowQuotaAlert = document.getElementById('fuelLowQuotaAlert');

    // Fuel Validation Modal DOM Elements
    const fuelValidationModal = document.getElementById('fuelValidationModal');
    const closeFuelValidationModalBtn = document.getElementById('closeFuelValidationModalBtn');
    const fvCancelBtn = document.getElementById('fvCancelBtn');
    const fvConfirmPublishBtn = document.getElementById('fvConfirmPublishBtn');
    const fvRoute = document.getElementById('fvRoute');
    const fvDistance = document.getElementById('fvDistance');
    const fvVehicle = document.getElementById('fvVehicle');
    const fvDate = document.getElementById('fvDate');
    const fvDateCheckRow = document.getElementById('fvDateCheckRow');
    const fvDateCheckStatus = document.getElementById('fvDateCheckStatus');
    const fvQuotaCheckRow = document.getElementById('fvQuotaCheckRow');
    const fvQuotaCheckStatus = document.getElementById('fvQuotaCheckStatus');
    const fvFuelNeeded = document.getElementById('fvFuelNeeded');
    const fvAfterQuota = document.getElementById('fvAfterQuota');
    const fvErrorNoticeBox = document.getElementById('fvErrorNoticeBox');
    const fvErrorEn = document.getElementById('fvErrorEn');
    const fvErrorSi = document.getElementById('fvErrorSi');

    // Refuel Modal DOM Elements
    const refuelModal = document.getElementById('refuelModal');
    const openRefuelModalBtn = document.getElementById('openRefuelModalBtn');
    const closeRefuelModalBtn = document.getElementById('closeRefuelModalBtn');
    const refuelForm = document.getElementById('refuelForm');
    const refuelModalPlate = document.getElementById('refuelModalPlate');
    const refuelModalEligibility = document.getElementById('refuelModalEligibility');
    const refuelModalCurrentQuota = document.getElementById('refuelModalCurrentQuota');
    const refuelMaxAllowedLiters = document.getElementById('refuelMaxAllowedLiters');
    const refuelLitersInput = document.getElementById('refuelLitersInput');
    const refuelEstimatedCostText = document.getElementById('refuelEstimatedCostText');

    // Refuel History Modal DOM Elements
    const refuelHistoryModal = document.getElementById('refuelHistoryModal');
    const openRefuelHistoryBtn = document.getElementById('openRefuelHistoryBtn');
    const closeRefuelHistoryModalBtn = document.getElementById('closeRefuelHistoryModalBtn');
    const refuelHistoryListContainer = document.getElementById('refuelHistoryListContainer');

    async function loadDriverVehicles() {
        if (!currentUser || !currentUser.uid) return;
        try {
            driverAvailableVehicles = [];

            // 1. Fetch vehicles where ownerId == driver.uid (Self-employed vehicles)
            const ownSnap = await db.collection('vehicles')
                .where('ownerId', '==', currentUser.uid)
                .get();
            ownSnap.forEach(doc => {
                driverAvailableVehicles.push({ id: doc.id, isSelfOwned: true, ...doc.data() });
            });

            // 2. Fetch vehicles where assignedDriverId == driver.uid (Owner-assigned fleet vehicles)
            const assignedSnap = await db.collection('vehicles')
                .where('assignedDriverId', '==', currentUser.uid)
                .get();
            assignedSnap.forEach(doc => {
                if (!driverAvailableVehicles.some(v => v.id === doc.id)) {
                    driverAvailableVehicles.push({ id: doc.id, isSelfOwned: false, ...doc.data() });
                }
            });

            // 3. Check Driver's User document for vehicle plate / profile vehicle
            const userDocSnap = await db.collection('users').doc(currentUser.uid).get();
            const uData = userDocSnap.exists ? userDocSnap.data() : {};
            const userPlate = uData.vehiclePlate || uData.plateNumber || currentUser.vehiclePlate || currentUser.plateNumber;

            if (userPlate && !driverAvailableVehicles.some(v => (v.plateNumber || '').trim().toUpperCase() === userPlate.trim().toUpperCase())) {
                // Check if this vehicle exists in vehicles collection by plateNumber
                const plateSnap = await db.collection('vehicles')
                    .where('plateNumber', '==', userPlate)
                    .get();
                
                if (!plateSnap.empty) {
                    plateSnap.forEach(doc => {
                        if (!driverAvailableVehicles.some(v => v.id === doc.id)) {
                            driverAvailableVehicles.push({ id: doc.id, isSelfOwned: true, ...doc.data() });
                        }
                    });
                } else {
                    // Create real persistent vehicle document in vehicles collection
                    const monthlyQ = Number(uData.monthlyQuota || 30.0);
                    const remQ = Number(uData.remainingQuota !== undefined ? uData.remainingQuota : 30.0);
                    const usedQ = Number(uData.fuelUsedThisMonth || (monthlyQ - remQ));
                    const newVDoc = await db.collection('vehicles').add({
                        ownerId: currentUser.uid,
                        ownerName: currentUser.name || 'Driver',
                        assignedDriverId: currentUser.uid,
                        assignedDriverName: currentUser.name || 'Driver',
                        plateNumber: userPlate,
                        makeModel: uData.vehicleModel || currentUser.vehicleModel || 'Car',
                        seats: uData.availableSeats || currentUser.availableSeats || 4,
                        monthlyQuota: monthlyQ,
                        remainingQuota: remQ,
                        fuelUsedThisMonth: usedQ,
                        status: 'Active',
                        type: 'Car',
                        driverSharePercent: 100,
                        ownerSharePercent: 0,
                        createdAt: new Date().toISOString()
                    });
                    driverAvailableVehicles.push({
                        id: newVDoc.id,
                        isSelfOwned: true,
                        plateNumber: userPlate,
                        makeModel: uData.vehicleModel || currentUser.vehicleModel || 'Car',
                        seats: uData.availableSeats || currentUser.availableSeats || 4,
                        monthlyQuota: monthlyQ,
                        remainingQuota: remQ,
                        fuelUsedThisMonth: usedQ,
                        driverSharePercent: 100,
                        ownerSharePercent: 0
                    });
                }
            }

            // 4. Ultimate Fallback: Default test vehicle if no profile data found
            if (driverAvailableVehicles.length === 0) {
                driverAvailableVehicles.push({
                    id: 'self_profile',
                    isSelfOwned: true,
                    plateNumber: 'WP CAB-1234',
                    makeModel: 'Car',
                    seats: 4,
                    monthlyQuota: 30.0,
                    remainingQuota: 30.0,
                    fuelUsedThisMonth: 0.0,
                    driverSharePercent: 100,
                    ownerSharePercent: 0
                });
            }

            // Populate Dropdown with Odd-Even & Quota badges (Matching UI Screenshot 2)
            if (offerVehicleSelect) {
                const today = new Date();
                const todayType = (today.getDate() % 2 === 0) ? 'EVEN' : 'ODD';

                offerVehicleSelect.innerHTML = driverAvailableVehicles.map(v => {
                    const plate = v.plateNumber || 'Plate';
                    const lastDigit = window.FuelQuotaEngine ? window.FuelQuotaEngine.extractLastDigit(plate) : (parseInt(plate.match(/\d/g)?.pop() || '0', 10));
                    const plateType = (lastDigit % 2 === 0) ? 'EVEN' : 'ODD';
                    const quota = Number(v.remainingQuota !== undefined ? v.remainingQuota : 30.0);
                    const isAvail = (plateType === todayType) && (quota > 1.2);
                    const isBlocked = (plateType !== todayType);

                    let statusTag = isAvail ? 'Available' : (isBlocked ? 'Blocked (Odd/Even)' : 'Low Fuel');
                    return `<option value="${v.id}">${plate} (${plateType}) - ${v.makeModel} [${statusTag} | ${quota}L left]</option>`;
                }).join('');

                // Trigger change handler for first item
                updateVehicleDetailsUI();
            }
        } catch (err) {
            console.error("Error loading driver vehicles:", err);
        }
    }

    function updateVehicleDetailsUI() {
        if (!offerVehicleSelect || driverAvailableVehicles.length === 0) return;
        const selectedId = offerVehicleSelect.value;
        const selectedV = driverAvailableVehicles.find(v => v.id === selectedId) || driverAvailableVehicles[0];

        if (selectedV) {
            if (offerSeatsInput && selectedV.seats) {
                offerSeatsInput.value = selectedV.seats;
                offerSeatsInput.max = selectedV.seats;
            }

            if (vehicleSplitBadge) {
                if (selectedV.isSelfOwned) {
                    vehicleSplitBadge.innerText = '100% Driver Earnings';
                    vehicleSplitBadge.style.background = 'rgba(27,94,32,0.1)';
                    vehicleSplitBadge.style.color = 'var(--primary-color)';
                } else {
                    const dShare = selectedV.driverSharePercent || 70;
                    const oShare = selectedV.ownerSharePercent || 30;
                    vehicleSplitBadge.innerText = `${dShare}% to You / ${oShare}% to Owner (${selectedV.ownerName || 'Owner'})`;
                    vehicleSplitBadge.style.background = 'rgba(255,193,7,0.15)';
                    vehicleSplitBadge.style.color = '#b45309';
                }
            }

            // Sync Profile Card with Selected Vehicle
            const dashVehicle = document.getElementById('vehicleModel');
            const dashPlate = document.getElementById('plateNumber');
            const dashSeats = document.getElementById('availableSeats');
            
            if (dashVehicle) dashVehicle.innerText = selectedV.makeModel || '--';
            if (dashPlate) dashPlate.innerText = selectedV.plateNumber || selectedV.vehiclePlate || '--';
            if (dashSeats) dashSeats.innerText = selectedV.seats || selectedV.availableSeats || '3';

            // Start Real-Time Listener on this specific selected vehicle for Live Quota Updates
            if (selectedV.id && selectedV.id !== 'self_profile') {
                if (activeVehicleUnsub) activeVehicleUnsub();
                activeVehicleUnsub = db.collection('vehicles').doc(selectedV.id).onSnapshot((doc) => {
                    if (doc.exists) {
                        const updatedData = { id: doc.id, ...doc.data() };
                        Object.assign(selectedV, updatedData);
                        renderFuelStatusCard(updatedData);
                        renderVehicleSelectionComplianceBox(updatedData);
                    }
                });
            } else {
                renderFuelStatusCard(selectedV);
                renderVehicleSelectionComplianceBox(selectedV);
            }
        }
    }

    // Render Fuel Status Card Metrics & Progress Bar
    function renderFuelStatusCard(vehicle) {
        if (!fuelStatusVehicleName) return;

        const plate = vehicle.plateNumber || vehicle.vehiclePlate || 'Vehicle';
        const lastDigit = window.FuelQuotaEngine ? window.FuelQuotaEngine.extractLastDigit(plate) : 4;
        const plateType = (lastDigit % 2 === 0) ? 'EVEN' : 'ODD';
        
        const today = new Date();
        const dateNum = today.getDate();
        const dateType = (dateNum % 2 === 0) ? 'EVEN' : 'ODD';
        const isEligible = (plateType === dateType);

        const maxQuota = Number(vehicle.monthlyQuota || 30.0);
        const remaining = Number(vehicle.remainingQuota !== undefined ? vehicle.remainingQuota : maxQuota);
        const used = Number(vehicle.fuelUsedThisMonth !== undefined ? vehicle.fuelUsedThisMonth : (maxQuota - remaining));
        const percentage = Math.min(100, Math.max(0, Math.round((remaining / maxQuota) * 100)));
        const estRidesLeft = Math.floor(remaining / 1.2); // based on 15km avg (1.2L per ride)

        // Update Elements
        if (fuelVehiclePlateBadge) {
            fuelVehiclePlateBadge.innerText = `${plate} (${plateType})`;
        }
        if (fuelStatusVehicleName) {
            fuelStatusVehicleName.innerText = `${plate} (${plateType} Plate)`;
        }
        if (fuelStatusTodayDate) {
            fuelStatusTodayDate.innerText = `${today.toISOString().split('T')[0]} (${dateType} Date)`;
        }

        // Eligibility Indicator
        if (fuelEligibilityIndicator) {
            if (isEligible) {
                fuelEligibilityIndicator.style.background = 'rgba(16,185,129,0.12)';
                fuelEligibilityIndicator.style.color = 'var(--success-color)';
                fuelEligibilityIndicator.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>Vehicle is ELIGIBLE to refuel today</span>`;
            } else {
                fuelEligibilityIndicator.style.background = 'rgba(239,68,68,0.12)';
                fuelEligibilityIndicator.style.color = 'var(--danger-color)';
                fuelEligibilityIndicator.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>Vehicle CANNOT refuel today. Only on ${plateType} dates</span>`;
            }
        }

        // Quota Progress Bar & Stats
        if (fuelQuotaRemainingText) fuelQuotaRemainingText.innerText = `${remaining.toFixed(1)} L / ${maxQuota.toFixed(1)} L`;
        if (fuelQuotaPercentageText) fuelQuotaPercentageText.innerText = `${percentage}%`;
        if (fuelQuotaProgressBar) {
            fuelQuotaProgressBar.style.width = `${percentage}%`;
            if (percentage <= 20) {
                fuelQuotaProgressBar.style.background = 'var(--danger-color)';
            } else if (percentage <= 50) {
                fuelQuotaProgressBar.style.background = 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
            } else {
                fuelQuotaProgressBar.style.background = 'linear-gradient(90deg, #10b981 0%, #1B5E20 100%)';
            }
        }

        if (fuelUsedThisMonthText) fuelUsedThisMonthText.innerText = `${used.toFixed(1)} L`;
        if (fuelEstimatedRidesLeftText) fuelEstimatedRidesLeftText.innerText = `${estRidesLeft} rides (15km avg)`;

        // Low Quota Alert Banner (< 20%)
        if (fuelLowQuotaAlert) {
            fuelLowQuotaAlert.style.display = (percentage <= 20) ? 'block' : 'none';
        }
    }

    // Render Vehicle Selection Compliance Box
    function renderVehicleSelectionComplianceBox(vehicle) {
        const infoBoxBadge = document.getElementById('selectedVehiclePlateTypeBadge');
        const infoBoxText = document.getElementById('selectedVehicleRestrictionText');
        if (!infoBoxText) return;

        const plate = vehicle.plateNumber || vehicle.vehiclePlate || 'Vehicle';
        const lastDigit = window.FuelQuotaEngine ? window.FuelQuotaEngine.extractLastDigit(plate) : 4;
        const plateType = (lastDigit % 2 === 0) ? 'EVEN' : 'ODD';
        const remaining = Number(vehicle.remainingQuota !== undefined ? vehicle.remainingQuota : 30.0);
        
        const targetDate = offerDateInput?.value ? new Date(offerDateInput.value) : new Date();
        const dateType = (targetDate.getDate() % 2 === 0) ? 'EVEN' : 'ODD';
        const isEligible = (plateType === dateType);

        if (infoBoxBadge) {
            infoBoxBadge.innerText = `${plateType} Plate (Ends with ${lastDigit})`;
            infoBoxBadge.style.background = 'rgba(16,185,129,0.15)';
            infoBoxBadge.style.color = 'var(--success-color)';
        }

        if (remaining >= 1.2) {
            infoBoxText.innerHTML = `<span style="color: var(--success-color); font-weight: 600;">Available for Rides</span> • Quota: <strong>${remaining}L</strong> <span style="font-size:0.78rem; color:#64748b;">(Refuel on ${plateType} dates)</span>`;
        } else {
            infoBoxText.innerHTML = `<span style="color: #b45309; font-weight: 600;">Low Fuel Quota</span> • Remaining: <strong>${remaining}L</strong>. Please refuel vehicle before publishing rides.`;
        }
    }

    if (offerVehicleSelect) {
        offerVehicleSelect.addEventListener('change', updateVehicleDetailsUI);
    }
    if (offerDateInput) {
        offerDateInput.min = new Date().toISOString().split('T')[0];
        offerDateInput.addEventListener('change', () => {
            const selectedId = offerVehicleSelect?.value;
            const selectedV = driverAvailableVehicles.find(v => v.id === selectedId) || driverAvailableVehicles[0];
            if (selectedV) renderVehicleSelectionComplianceBox(selectedV);
        });
    }

    // Load driver vehicles on startup
    loadDriverVehicles();

    // ─── Current Active Ride Real-Time Listener (Driver) ─────────────────
    let driverRidesUnsub = null;
    let driverRequestsUnsub = null;
    let activeDriverRidesCache = [];
    let activeDriverReqsCache = [];

    async function renderDriverActiveState(driverId) {
        const contentEl = document.getElementById('driverActiveRideContent');
        const badgeEl = document.getElementById('driverActiveRideStatusBadge');
        if (!contentEl) return;

        // 1. If active published ride exists
        if (activeDriverRidesCache.length > 0) {
            const ride = activeDriverRidesCache[0];

            // Fetch live passenger bookings for this ride
            let passengers = [];
            try {
                const bookSnap = await db.collection('bookings')
                    .where('rideId', '==', ride.id)
                    .get();
                bookSnap.forEach(bDoc => {
                    const bData = bDoc.data();
                    if (bData.status !== 'Cancelled' && bData.status !== 'cancelled') {
                        passengers.push(bData);
                    }
                });
            } catch (err) {
                console.warn("Error fetching passengers for active ride:", err);
            }

            if (badgeEl) {
                badgeEl.innerHTML = `
                    <span class="badge" style="background: rgba(16,185,129,0.15); color: #10b981; font-weight: 700; font-size: 0.8rem; padding: 6px 12px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px;">
                        <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; animation: pulseDot 1.5s infinite;"></span>
                        Live Trip Active
                    </span>
                `;
            }

            let passengerHtml = '';
            if (passengers.length > 0) {
                passengerHtml = `
                    <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 14px; padding: 14px; margin-bottom: 15px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div style="font-size: 0.85rem; font-weight: 700; color: var(--primary-color);">
                                <i class="fa-solid fa-users me-1"></i> Booked Passengers (${passengers.length})
                            </div>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">Individual drop-off or complete all below</span>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${passengers.map((p, idx) => {
                                const isCompleted = (p.status || '').toLowerCase() === 'completed';
                                return `
                                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; background: ${isCompleted ? 'rgba(16,185,129,0.04)' : 'rgba(0,0,0,0.02)'}; padding: 10px 14px; border-radius: 10px; border: 1px solid ${isCompleted ? 'rgba(16,185,129,0.2)' : 'var(--border-color)'}; font-size: 0.85rem;">
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${isCompleted ? 'var(--success-color)' : 'var(--primary-color)'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700;">
                                                ${(p.passengerName || 'P').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style="font-weight: 600; color: #1e293b;">
                                                    ${p.passengerName || 'Passenger ' + (idx + 1)}
                                                    ${isCompleted ? '<span class="badge ms-2" style="background: rgba(16,185,129,0.15); color: #10b981; font-size: 0.72rem;"><i class="fa-solid fa-check me-1"></i> Completed</span>' : '<span class="badge ms-2" style="background: rgba(14,165,233,0.12); color: #0284c7; font-size: 0.72rem;">In Transit</span>'}
                                                </div>
                                                <div style="font-size: 0.75rem; color: var(--text-muted);">${p.rideFrom || ride.start} &rarr; ${p.rideTo || ride.dest}</div>
                                            </div>
                                        </div>
                                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                                            <div style="text-align: right; margin-right: 6px;">
                                                <strong style="color: var(--success-color); font-size: 0.95rem;">Rs. ${p.amount || ride.price || 350}</strong>
                                                <div style="font-size: 0.7rem; color: var(--text-muted);">${p.paymentMethod || 'ICBT Wallet'}</div>
                                            </div>
                                            ${!isCompleted ? `
                                                <button class="btn btn-sm" style="background: rgba(0,0,0,0.05); color: var(--text-main); border: 1px solid var(--border-color); padding: 6px 10px; font-size: 0.78rem; border-radius: 8px;" onclick="openChatForPassenger('${p.passengerId}', '${(p.passengerName || 'Passenger').replace(/'/g, "\\'")}', '${p.id}')" title="Chat with Passenger">
                                                    <i class="fa-solid fa-comments"></i>
                                                </button>
                                                <button class="btn btn-sm btn-primary" style="padding: 6px 12px; font-size: 0.78rem; border-radius: 8px; font-weight: 600; white-space: nowrap;" onclick="completePassengerDropoff('${p.id}', '${ride.id}')">
                                                    <i class="fa-solid fa-flag-checkered me-1"></i> Drop-off
                                                </button>
                                            ` : `
                                                <span class="badge" style="background: rgba(16,185,129,0.15); color: #10b981; padding: 6px 10px; border-radius: 8px; font-weight: 600; font-size: 0.75rem;">
                                                    <i class="fa-solid fa-circle-check me-1"></i> Paid & Done
                                                </span>
                                            `}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            } else {
                passengerHtml = `
                    <div style="background: rgba(255,193,7,0.08); border: 1px solid rgba(255,193,7,0.2); border-radius: 10px; padding: 10px 14px; margin-bottom: 15px; font-size: 0.82rem; color: #b45309; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-circle-info"></i>
                        <span>Waiting for passenger bookings. ${ride.seats || 4} seats open.</span>
                    </div>
                `;
            }

            contentEl.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 14px;">
                    <div>
                        <div style="font-size: 1.15rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span><i class="fa-regular fa-circle-dot" style="color: var(--primary-color);"></i> ${ride.start || ride.origin}</span>
                            <i class="fa-solid fa-arrow-right" style="color: var(--primary-color); font-size: 0.85rem;"></i>
                            <span><i class="fa-solid fa-location-dot" style="color: var(--secondary-color);"></i> ${ride.dest || ride.destination}</span>
                        </div>
                        <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px; display: flex; gap: 12px; flex-wrap: wrap;">
                            <span><i class="fa-regular fa-calendar me-1"></i> ${ride.date || 'Today'}</span>
                            <span><i class="fa-regular fa-clock me-1"></i> ${ride.time || 'N/A'}</span>
                            <span><i class="fa-solid fa-car me-1"></i> ${ride.vehicle || 'Vehicle'} (${ride.plateNumber || ride.vehicle || 'Plate'})</span>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.25rem; font-weight: 700; color: var(--primary-color);">Rs. ${ride.price || 350}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Per Seat</div>
                    </div>
                </div>

                ${passengerHtml}

                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn" style="flex: 1; min-width: 130px; padding: 10px 14px; background: rgba(27,94,32,0.1); color: var(--primary-color); border: 1px solid var(--primary-color); font-weight: 600; font-size: 0.85rem; border-radius: 10px;" onclick="window.showRideRouteMap ? window.showRideRouteMap('${(ride.start || '').replace(/'/g, "\\'")}', '${(ride.dest || '').replace(/'/g, "\\'")}') : null">
                        <i class="fa-solid fa-map-location-dot me-1"></i> Route Map
                    </button>
                    <button class="btn" style="flex: 0.9; min-width: 140px; padding: 10px 14px; background: rgba(220,38,38,0.1); color: #dc2626; border: 1px solid rgba(220,38,38,0.35); font-weight: 700; font-size: 0.85rem; border-radius: 10px;" onclick="window.openEmergencySosModal ? window.openEmergencySosModal({ rideId: '${ride.id}', start: '${(ride.start || '').replace(/'/g, "\\'")}', dest: '${(ride.dest || '').replace(/'/g, "\\'")}', passengerId: '${passengers[0]?.passengerId || ''}', passengerName: '${(passengers[0]?.passengerName || '').replace(/'/g, "\\'")}', passengerPhone: '${passengers[0]?.passengerPhone || ''}', fareReward: ${ride.price || 350}, role: 'driver' }) : null">
                        <i class="fa-solid fa-triangle-exclamation me-1"></i> SOS / Breakdown
                    </button>
                    <button class="btn btn-primary" style="flex: 1.2; min-width: 150px; padding: 10px 16px; font-weight: 600; font-size: 0.85rem; border-radius: 10px;" onclick="completeRide('${ride.id}')">
                        <i class="fa-solid fa-circle-check me-1"></i> Complete Entire Trip
                    </button>
                </div>
            `;
            return;
        }

        // 2. If driver accepted custom RideRequest
        if (activeDriverReqsCache.length > 0) {
            const req = activeDriverReqsCache[0];
            if (badgeEl) {
                badgeEl.innerHTML = `<span class="badge" style="background: rgba(14,165,233,0.15); color: #0284c7; font-weight: 700; font-size: 0.8rem; padding: 6px 12px; border-radius: 12px;"><i class="fa-solid fa-handshake me-1"></i> Accepted Passenger Request</span>`;
            }
            contentEl.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 14px;">
                    <div>
                        <div style="font-size: 1.15rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                            <span><i class="fa-regular fa-circle-dot" style="color: var(--primary-color);"></i> ${req.origin}</span>
                            <i class="fa-solid fa-arrow-right" style="color: var(--primary-color); font-size: 0.85rem;"></i>
                            <span><i class="fa-solid fa-location-dot" style="color: var(--secondary-color);"></i> ${req.destination}</span>
                        </div>
                        <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">
                            <span><i class="fa-regular fa-calendar me-1"></i> ${req.date || 'Today'} at ${req.time || 'N/A'}</span> &bull; 
                            <span><i class="fa-solid fa-user me-1"></i> Passenger: <strong>${req.passengerName || 'Passenger'}</strong></span>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.25rem; font-weight: 700; color: var(--success-color);">Rs. ${req.amount || req.fare || 350}</div>
                        <span class="badge" style="background: rgba(16,185,129,0.12); color: var(--success-color); font-weight: 700;">Accepted</span>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn" style="flex: 1; min-width: 130px; padding: 10px 14px; background: rgba(27,94,32,0.1); color: var(--primary-color); border: 1px solid var(--primary-color); font-weight: 600; font-size: 0.85rem; border-radius: 10px;" onclick="window.showRideRouteMap ? window.showRideRouteMap('${(req.origin || '').replace(/'/g, "\\'")}', '${(req.destination || '').replace(/'/g, "\\'")}') : null">
                        <i class="fa-solid fa-map-location-dot me-1"></i> Route Map
                    </button>
                    <button class="btn" style="flex: 0.9; min-width: 130px; padding: 10px 14px; background: rgba(220,38,38,0.1); color: #dc2626; border: 1px solid rgba(220,38,38,0.35); font-weight: 700; font-size: 0.85rem; border-radius: 10px;" onclick="window.openEmergencySosModal ? window.openEmergencySosModal({ requestId: '${req.id}', start: '${(req.origin || '').replace(/'/g, "\\'")}', dest: '${(req.destination || '').replace(/'/g, "\\'")}', passengerId: '${req.passengerId || ''}', passengerName: '${(req.passengerName || 'Passenger').replace(/'/g, "\\'")}', passengerPhone: '${req.passengerPhone || ''}', fareReward: ${req.amount || req.fare || 350}, role: 'driver' }) : null">
                        <i class="fa-solid fa-triangle-exclamation me-1"></i> SOS / Breakdown
                    </button>
                    <button class="btn" style="flex: 1; min-width: 120px; padding: 10px 14px; background: rgba(16,185,129,0.12); color: var(--primary-color); border: 1px solid var(--primary-color); font-weight: 600; font-size: 0.85rem; border-radius: 10px;" onclick="openChatForPassenger('${req.passengerId}', '${(req.passengerName || 'Passenger').replace(/'/g, "\\'")}', '${req.id}')">
                        <i class="fa-solid fa-comments me-1"></i> Chat
                    </button>
                    <button class="btn btn-primary" style="flex: 1.2; min-width: 140px; padding: 10px 16px; font-weight: 600; font-size: 0.85rem; border-radius: 10px;" onclick="completeCustomRequest('${req.id}')">
                        <i class="fa-solid fa-circle-check me-1"></i> Complete Trip
                    </button>
                </div>
            `;
            return;
        }

        // 3. No Active Ride
        if (badgeEl) {
            badgeEl.innerHTML = `<span class="badge" style="background: rgba(0,0,0,0.06); color: var(--text-muted); font-size: 0.78rem; font-weight: 600;"><i class="fa-solid fa-bed me-1"></i> Idle &bull; No Active Trip</span>`;
        }
        contentEl.innerHTML = `
            <div style="text-align: center; padding: 22px 15px; color: var(--text-muted);">
                <i class="fa-solid fa-route fa-2x" style="color: rgba(27,94,32,0.35); margin-bottom: 8px;"></i>
                <div style="font-weight: 600; color: #1e293b; font-size: 0.95rem; margin-bottom: 4px;">No Ride Currently in Progress</div>
                <p style="margin: 0 0 14px 0; font-size: 0.82rem;">You haven't published an active ride yet. Offer a route below to start taking campus passengers!</p>
                <button class="btn btn-primary" onclick="document.getElementById('offerStart')?.focus(); window.scrollTo({top: 400, behavior: 'smooth'});" style="padding: 8px 18px; font-size: 0.85rem; border-radius: 8px;">
                    <i class="fa-solid fa-plus me-1"></i> Publish Ride Below
                </button>
            </div>
        `;
    }

    let rescueAlertsUnsub = null;
    let myAcceptedRescueUnsub = null;

    function initDriverActiveRideListener(driverId) {
        if (!driverId || !db) return;

        if (driverRidesUnsub) driverRidesUnsub();
        if (driverRequestsUnsub) driverRequestsUnsub();
        if (rescueAlertsUnsub) rescueAlertsUnsub();
        if (myAcceptedRescueUnsub) myAcceptedRescueUnsub();

        // 1. Real-time published rides
        driverRidesUnsub = db.collection('rides')
            .where('driverId', '==', driverId)
            .where('status', '==', 'active')
            .onSnapshot((snap) => {
                activeDriverRidesCache = [];
                snap.forEach(d => activeDriverRidesCache.push({ id: d.id, ...d.data() }));
                activeDriverRidesCache.sort((a, b) => {
                    const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                    const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                    return timeB - timeA;
                });
                renderDriverActiveState(driverId);
            }, err => console.warn("Live driver rides error:", err));

        // 2. Real-time accepted custom requests
        driverRequestsUnsub = db.collection('RideRequests')
            .where('driverId', '==', driverId)
            .where('status', '==', 'accepted')
            .onSnapshot((snap) => {
                activeDriverReqsCache = [];
                snap.forEach(d => activeDriverReqsCache.push({ id: d.id, ...d.data() }));
                activeDriverReqsCache.sort((a, b) => {
                    const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.date ? new Date(`${a.date} ${a.time || '00:00'}`).getTime() : 0);
                    const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.date ? new Date(`${b.date} ${b.time || '00:00'}`).getTime() : 0);
                    return timeB - timeA;
                });
                renderDriverActiveState(driverId);
            }, err => console.warn("Live driver requests error:", err));

        // 3. Real-time Open Emergency Rescue Alerts (from other campus drivers)
        const rescueContainer = document.getElementById('driverRescueAlertContainer');
        rescueAlertsUnsub = db.collection('rescue_requests')
            .where('status', '==', 'open_for_rescue')
            .onSnapshot((snap) => {
                if (!rescueContainer) return;
                const openRescues = [];
                snap.forEach(d => {
                    const rData = d.data();
                    if (rData.originalDriverId !== driverId) {
                        openRescues.push({ id: d.id, ...rData });
                    }
                });

                if (openRescues.length === 0) {
                    rescueContainer.style.display = 'none';
                    rescueContainer.innerHTML = '';
                    return;
                }

                const rescue = openRescues[0];
                rescueContainer.style.display = 'block';
                rescueContainer.innerHTML = `
                    <div class="icbt-rescue-alert-banner">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                            <div>
                                <span class="badge" style="background: #ffffff; color: #dc2626; font-weight: 800; font-size: 0.82rem; padding: 4px 10px; border-radius: 8px; margin-bottom: 6px; display: inline-block;">
                                    <i class="fa-solid fa-triangle-exclamation me-1"></i> URGENT RESCUE PICKUP AVAILABLE
                                </span>
                                <h3 style="margin: 0 0 6px 0; font-size: 1.15rem; font-weight: 700; color: #ffffff;">Stranded Passenger: ${rescue.passengerName || 'Campus Passenger'}</h3>
                                <div style="font-size: 0.85rem; opacity: 0.95;">
                                    <i class="fa-solid fa-location-dot me-1"></i> Breakdown at: <strong>${rescue.origin}</strong> &rarr; Destination: <strong>${rescue.destination}</strong>
                                </div>
                                <div style="font-size: 0.8rem; margin-top: 4px; opacity: 0.85;">
                                    Original Driver: ${rescue.originalDriverName || 'Driver'} &bull; Cause: ${rescue.incidentType}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 1.35rem; font-weight: 800; color: #fef08a;">+ Rs. ${rescue.fareReward || 350}</div>
                                <div style="font-size: 0.72rem; opacity: 0.9;">Wallet Reward Payout</div>
                            </div>
                        </div>
                        <div style="margin-top: 14px; display: flex; gap: 10px; flex-wrap: wrap;">
                            <button type="button" class="btn" style="flex: 1; min-width: 140px; padding: 10px; background: rgba(255,255,255,0.2); color: #ffffff; border: 1px solid rgba(255,255,255,0.4); border-radius: 10px; font-weight: 600;" onclick="window.showRideRouteMap ? window.showRideRouteMap('${(rescue.origin || '').replace(/'/g, "\\'")}', '${(rescue.destination || '').replace(/'/g, "\\'")}') : null">
                                <i class="fa-solid fa-map-location-dot me-1"></i> View Breakdown Spot
                            </button>
                            <button type="button" class="btn" style="flex: 1.4; min-width: 160px; padding: 10px; background: #ffffff; color: #dc2626; border: none; border-radius: 10px; font-weight: 700; box-shadow: 0 4px 12px rgba(0,0,0,0.2);" onclick="window.acceptEmergencyRescue('${rescue.id}')">
                                <i class="fa-solid fa-handshake-angle me-1"></i> Accept Rescue Pickup
                            </button>
                        </div>
                    </div>
                `;
            }, err => console.warn("Live rescue alerts error:", err));

        // 4. Real-time My Accepted Rescues
        myAcceptedRescueUnsub = db.collection('rescue_requests')
            .where('rescueDriverId', '==', driverId)
            .where('status', '==', 'rescue_accepted')
            .onSnapshot((snap) => {
                if (!rescueContainer) return;
                if (!snap.empty) {
                    const myRescueDoc = snap.docs[0];
                    const myRescue = { id: myRescueDoc.id, ...myRescueDoc.data() };
                    rescueContainer.style.display = 'block';
                    rescueContainer.innerHTML = `
                        <div style="background: #ffffff; border: 2px solid #16a34a; border-radius: 18px; padding: 20px; margin-bottom: 20px; box-shadow: 0 8px 25px rgba(22,163,74,0.15);">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                                <div>
                                    <span class="badge" style="background: rgba(22,163,74,0.12); color: #16a34a; font-weight: 800; font-size: 0.8rem; padding: 4px 10px; border-radius: 8px;">
                                        <i class="fa-solid fa-car-side me-1"></i> Active Rescue Pickup in Progress
                                    </span>
                                    <h4 style="margin: 6px 0 2px 0; font-size: 1.15rem; color: #0f172a; font-weight: 700;">Passenger: ${myRescue.passengerName || 'Campus Passenger'}</h4>
                                    <div style="font-size: 0.85rem; color: var(--text-muted);"><i class="fa-solid fa-location-dot me-1 text-danger"></i> Pickup at: <strong>${myRescue.origin}</strong> &rarr; Drop off: <strong>${myRescue.destination}</strong></div>
                                </div>
                                <div style="text-align: right;">
                                    <strong style="color: #16a34a; font-size: 1.3rem;">Rs. ${myRescue.fareReward || 350}</strong>
                                    <div style="font-size: 0.72rem; color: var(--text-muted);">Completion Payout</div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                <button type="button" class="btn" style="flex: 1; padding: 10px; background: rgba(22,163,74,0.1); color: #16a34a; border: 1px solid #16a34a; border-radius: 10px; font-weight: 600;" onclick="window.showRideRouteMap ? window.showRideRouteMap('${(myRescue.origin || '').replace(/'/g, "\\'")}', '${(myRescue.destination || '').replace(/'/g, "\\'")}') : null">
                                    <i class="fa-solid fa-location-arrow me-1"></i> Route Map
                                </button>
                                <button type="button" class="btn btn-primary" style="flex: 1.4; padding: 10px; background: #16a34a; border: none; border-radius: 10px; font-weight: 700;" onclick="window.completeEmergencyRescueTrip('${myRescue.id}')">
                                    <i class="fa-solid fa-circle-check me-1"></i> Complete Rescue Trip & Collect Rs. ${myRescue.fareReward || 350}
                                </button>
                            </div>
                        </div>
                    `;
                }
            }, err => console.warn("Live my accepted rescue error:", err));
    }

    if (currentUser && currentUser.uid) {
        initDriverActiveRideListener(currentUser.uid);
    }

    // --- Offer a Ride Form Submission & Fuel Validation Modal ---
    const offerRideForm = document.getElementById('offerRideForm');
    if (offerRideForm) {
        offerRideForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const start = document.getElementById('offerStart').value.trim();
            const dest = document.getElementById('offerDest').value.trim();
            const date = document.getElementById('offerDate').value;
            const time = document.getElementById('offerTime').value;
            const seats = parseInt(document.getElementById('offerSeats').value) || 3;

            if (!start || !dest || !date || !time) {
                alert('Please fill in all required fields.');
                return;
            }

            const selectedVehicleId = offerVehicleSelect ? offerVehicleSelect.value : null;
            const selectedV = driverAvailableVehicles.find(v => v.id === selectedVehicleId) || driverAvailableVehicles[0] || {};

            // Query real map distance
            let realDistKm = 25.0;
            if (window.MapService && typeof window.MapService.geocodeLocation === 'function') {
                try {
                    const c1 = await window.MapService.geocodeLocation(start);
                    const c2 = await window.MapService.geocodeLocation(dest);
                    if (c1 && c2) {
                        const route = await window.MapService.fetchRoadRoute(c1, c2);
                        if (route && route.distanceKm) {
                            realDistKm = route.distanceKm;
                        }
                    }
                } catch (mapErr) {
                    console.warn("Map distance query fallback:", mapErr);
                }
            }
            if (!realDistKm || realDistKm <= 0) {
                realDistKm = window.FuelQuotaEngine ? window.FuelQuotaEngine.estimateDistance(start, dest) : 25.0;
            }

            // Perform Fuel Validation with exact distance
            const validation = window.FuelQuotaEngine ? window.FuelQuotaEngine.validateRideCreation({
                vehicle: selectedV,
                date: date,
                origin: start,
                destination: dest,
                distanceKm: realDistKm
            }) : { isValid: true, distanceKm: realDistKm, fuelNeeded: (realDistKm * 0.08).toFixed(2), fuelCostLkr: Math.round(realDistKm * 0.08 * 320), afterRideQuota: (28.8 - realDistKm * 0.08).toFixed(1), dateCheckPassed: true, quotaCheckPassed: true };

            const estimatedPerSeatFare = Math.max(150, Math.round((120 + (realDistKm * 18)) / 10) * 10);

            // Save for confirm publish
            currentValidatedRideData = {
                start,
                dest,
                date,
                time,
                seats,
                price: estimatedPerSeatFare,
                selectedV,
                validation
            };

            // Populate Fuel Validation Modal
            if (fvRoute) fvRoute.innerText = `${start} → ${dest}`;
            if (fvDistance) fvDistance.innerText = `${validation.distanceKm} km`;
            const fvFareEl = document.getElementById('fvPassengerFare');
            if (fvFareEl) fvFareEl.innerText = `Rs. ${estimatedPerSeatFare}`;
            if (fvVehicle) fvVehicle.innerText = `${selectedV.plateNumber || selectedV.vehiclePlate || 'Vehicle'} (${validation.plateType || 'EVEN'} Plate)`;
            if (fvDate) fvDate.innerText = `${date} (${validation.dateType || 'EVEN'} Date)`;

            if (fvDateCheckStatus && fvDateCheckRow) {
                fvDateCheckStatus.innerText = 'PASSED (Driving Allowed on Any Day)';
                fvDateCheckStatus.style.color = 'var(--success-color)';
                fvDateCheckRow.style.background = 'rgba(16,185,129,0.1)';
            }

            if (fvQuotaCheckStatus && fvQuotaCheckRow) {
                if (validation.quotaCheckPassed) {
                    fvQuotaCheckStatus.innerText = `PASSED (${validation.currentQuota}L remaining)`;
                    fvQuotaCheckStatus.style.color = 'var(--success-color)';
                    fvQuotaCheckRow.style.background = 'rgba(16,185,129,0.1)';
                } else {
                    fvQuotaCheckStatus.innerText = `FAILED (${validation.currentQuota}L insufficient)`;
                    fvQuotaCheckStatus.style.color = 'var(--danger-color)';
                    fvQuotaCheckRow.style.background = 'rgba(239,68,68,0.1)';
                }
            }

            if (fvFuelNeeded) fvFuelNeeded.innerText = `${validation.fuelNeeded} L (~LKR ${validation.fuelCostLkr})`;
            if (fvAfterQuota) fvAfterQuota.innerText = `${validation.afterRideQuota} L`;

            if (fvErrorNoticeBox) {
                if (!validation.isValid) {
                    fvErrorNoticeBox.style.display = 'block';
                    if (fvErrorEn) fvErrorEn.innerText = validation.errorEn;
                    if (fvErrorSi) fvErrorSi.innerText = validation.errorSi;
                    if (fvConfirmPublishBtn) {
                        fvConfirmPublishBtn.disabled = true;
                        fvConfirmPublishBtn.style.opacity = '0.5';
                    }
                } else {
                    fvErrorNoticeBox.style.display = 'none';
                    if (fvConfirmPublishBtn) {
                        fvConfirmPublishBtn.disabled = false;
                        fvConfirmPublishBtn.style.opacity = '1';
                    }
                }
            }

            // Open Modal
            if (fuelValidationModal) fuelValidationModal.classList.add('active');
        });
    }

    // Modal Close Handlers
    const closeFvModal = () => { if (fuelValidationModal) fuelValidationModal.classList.remove('active'); };
    if (closeFuelValidationModalBtn) closeFuelValidationModalBtn.addEventListener('click', closeFvModal);
    if (fvCancelBtn) fvCancelBtn.addEventListener('click', closeFvModal);

    // Confirm & Publish Ride Handler
    if (fvConfirmPublishBtn) {
        fvConfirmPublishBtn.addEventListener('click', async () => {
            if (!currentValidatedRideData || !currentValidatedRideData.validation.isValid) return;

            const { start, dest, date, time, seats, selectedV, validation } = currentValidatedRideData;
            const userRaw = localStorage.getItem('loggedInUser');
            const userObj = userRaw ? JSON.parse(userRaw) : currentUser;

            const origText = fvConfirmPublishBtn.innerHTML;
            fvConfirmPublishBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...';
            fvConfirmPublishBtn.disabled = true;

            try {
                const vehicleModel = selectedV.makeModel || userObj.vehicleModel || 'Car';
                const plate = selectedV.plateNumber || userObj.plateNumber || '';
                const isOwnerDriver = selectedV.isSelfOwned !== false;
                const ownerId = isOwnerDriver ? currentUser.uid : (selectedV.ownerId || null);
                const ownerName = isOwnerDriver ? (userObj.name || 'Self') : (selectedV.ownerName || 'Vehicle Owner');
                const driverShare = isOwnerDriver ? 100 : Number(selectedV.driverSharePercent || 70);
                const ownerShare = isOwnerDriver ? 0 : Number(selectedV.ownerSharePercent || 30);

                const newRide = {
                    start: start,
                    origin: start,
                    dest: dest,
                    destination: dest,
                    date: date,
                    time: time,
                    seats: seats,
                    availableSeats: seats,
                    price: 350, // Standard base fare
                    distanceKm: validation.distanceKm,
                    fuelNeeded: validation.fuelNeeded,
                    fuelCostLkr: validation.fuelCostLkr,
                    driverId: currentUser.uid,
                    driverName: userObj.name || currentUser.name || 'Driver',
                    driverPhone: userObj.phone || '',
                    vehicle: vehicleModel,
                    vehicleModel: vehicleModel,
                    plateNumber: plate,
                    vehicleId: selectedV.id || null,
                    ownerId: ownerId,
                    ownerName: ownerName,
                    isOwnerDriver: isOwnerDriver,
                    driverSharePercent: driverShare,
                    ownerSharePercent: ownerShare,
                    status: 'active',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdAtMs: Date.now(),
                    expiresAt: Date.now() + 2 * 60 * 60 * 1000 // 2-Hour Expiration Window
                };

                await db.collection('rides').add(newRide);

                closeFvModal();
                showSuccessModal('Ride Published', `Your ride from ${start} to ${dest} (${validation.distanceKm}km, 2-Hour Validity) is live on passenger search.`);
                offerRideForm.reset();
                updateVehicleDetailsUI();
            } catch (error) {
                console.error("Error publishing ride:", error);
                alert("Failed to publish ride. Please try again.");
            } finally {
                fvConfirmPublishBtn.innerHTML = origText;
                fvConfirmPublishBtn.disabled = false;
            }
        });
    }

    // --- Refuel Vehicle Feature ("fule gahuwa kiyala pennanna one") ---
    if (openRefuelModalBtn && refuelModal) {
        openRefuelModalBtn.addEventListener('click', () => {
            const selectedId = offerVehicleSelect?.value;
            const selectedV = driverAvailableVehicles.find(v => v.id === selectedId) || driverAvailableVehicles[0];
            if (!selectedV) {
                alert("No vehicle selected or available to refuel.");
                return;
            }

            const plate = selectedV.plateNumber || 'Vehicle';
            const lastDigit = window.FuelQuotaEngine ? window.FuelQuotaEngine.extractLastDigit(plate) : (parseInt(plate.match(/\d/g)?.pop() || '4', 10));
            const plateType = (lastDigit % 2 === 0) ? 'EVEN' : 'ODD';
            const today = new Date();
            const dateNum = today.getDate();
            const dateType = (dateNum % 2 === 0) ? 'EVEN' : 'ODD';
            const isEligible = (plateType === dateType);

            const maxQuota = Number(selectedV.monthlyQuota || 30.0);
            const remaining = Number(selectedV.remainingQuota !== undefined ? selectedV.remainingQuota : 30.0);
            const maxRefuelPossible = parseFloat(Math.max(0, maxQuota - remaining).toFixed(1));

            const warningBox = document.getElementById('refuelModalWarningBox');
            const warningTitle = document.getElementById('refuelModalWarningTitle');
            const warningText = document.getElementById('refuelModalWarningText');
            const submitBtn = document.getElementById('confirmRefuelSubmitBtn');

            if (refuelModalPlate) refuelModalPlate.innerText = `${plate} (${plateType} Plate - Ends in ${lastDigit})`;
            if (refuelModalCurrentQuota) refuelModalCurrentQuota.innerText = `${remaining.toFixed(1)} L / ${maxQuota.toFixed(1)} L`;
            if (refuelMaxAllowedLiters) refuelMaxAllowedLiters.innerText = maxRefuelPossible.toFixed(1);

            if (refuelModalEligibility) {
                if (isEligible) {
                    refuelModalEligibility.innerText = `ELIGIBLE TODAY (${dateType} Date - Day ${dateNum})`;
                    refuelModalEligibility.style.color = 'var(--success-color)';
                    if (warningBox) warningBox.style.display = 'none';
                    if (refuelLitersInput) {
                        refuelLitersInput.disabled = false;
                        refuelLitersInput.max = maxRefuelPossible;
                        refuelLitersInput.value = Math.min(5.0, maxRefuelPossible);
                    }
                    if (refuelEstimatedCostText) {
                        refuelEstimatedCostText.innerText = `LKR ${(Math.min(5.0, maxRefuelPossible) * 320).toLocaleString()}.00`;
                    }
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fa-solid fa-circle-check me-1"></i> Confirm Refuel & Update Quota';
                        submitBtn.style.opacity = '1';
                        submitBtn.style.cursor = 'pointer';
                    }
                } else {
                    refuelModalEligibility.innerText = `BLOCKED TODAY (${dateType} Date - Day ${dateNum})`;
                    refuelModalEligibility.style.color = 'var(--danger-color)';
                    if (warningBox) {
                        warningBox.style.display = 'block';
                        if (warningTitle) warningTitle.innerText = `🚫 Refueling Blocked on ${dateType} Calendar Dates`;
                        if (warningText) {
                            warningText.innerHTML = `
                                <strong>Odd-Even Regulation Violation:</strong><br>
                                Vehicle plate <strong>${plate}</strong> ends in number <strong>${lastDigit}</strong> (${plateType} Plate).<br>
                                Today's calendar date is <strong>Day ${dateNum} (${dateType} Date)</strong>.<br>
                                You are strictly <strong>NOT ALLOWED</strong> to pump fuel today. You can only refuel this vehicle on <strong>${plateType} calendar dates</strong>.
                            `;
                        }
                    }
                    if (refuelLitersInput) {
                        refuelLitersInput.disabled = true;
                        refuelLitersInput.value = 0;
                    }
                    if (refuelEstimatedCostText) {
                        refuelEstimatedCostText.innerText = `LKR 0.00`;
                    }
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.innerHTML = `<i class="fa-solid fa-ban me-1"></i> Refuel Blocked Today (${dateType} Date)`;
                        submitBtn.style.opacity = '0.6';
                        submitBtn.style.cursor = 'not-allowed';
                    }
                }
            }

            refuelModal.classList.add('active');
        });
    }

    if (closeRefuelModalBtn && refuelModal) {
        closeRefuelModalBtn.addEventListener('click', () => refuelModal.classList.remove('active'));
    }

    if (refuelLitersInput && refuelEstimatedCostText) {
        refuelLitersInput.addEventListener('input', () => {
            const liters = parseFloat(refuelLitersInput.value) || 0;
            refuelEstimatedCostText.innerText = `LKR ${(liters * 320).toLocaleString()}.00`;
        });
    }

    if (refuelForm) {
        refuelForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const selectedId = offerVehicleSelect?.value;
            const selectedV = driverAvailableVehicles.find(v => v.id === selectedId) || driverAvailableVehicles[0];
            if (!selectedV) return;

            const plate = selectedV.plateNumber || 'Vehicle';
            const lastDigit = window.FuelQuotaEngine ? window.FuelQuotaEngine.extractLastDigit(plate) : (parseInt(plate.match(/\d/g)?.pop() || '4', 10));
            const plateType = (lastDigit % 2 === 0) ? 'EVEN' : 'ODD';
            const today = new Date();
            const dateNum = today.getDate();
            const dateType = (dateNum % 2 === 0) ? 'EVEN' : 'ODD';

            if (plateType !== dateType) {
                alert(`🚫 Odd-Even Restriction Violation: Vehicle ${plate} ends in ${lastDigit} (${plateType} Plate) and can ONLY refuel on ${plateType} calendar dates. Today is Day ${dateNum} (${dateType} Date). Refueling is strictly prohibited!`);
                return;
            }

            const maxQuota = Number(selectedV.monthlyQuota || 30.0);
            const currentRemaining = Number(selectedV.remainingQuota !== undefined ? selectedV.remainingQuota : 30.0);
            const litersToAdd = parseFloat(refuelLitersInput.value) || 0;

            if (litersToAdd <= 0) {
                alert("Please enter a valid fuel quantity in liters.");
                return;
            }

            if (currentRemaining >= maxQuota) {
                alert(`Your vehicle quota is already full (${maxQuota} L). You cannot add more fuel beyond the monthly quota.`);
                return;
            }

            const submitBtn = document.getElementById('confirmRefuelSubmitBtn');
            const origText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Refuel...';
            submitBtn.disabled = true;

            try {
                const newRemaining = Math.min(maxQuota, parseFloat((currentRemaining + litersToAdd).toFixed(2)));
                const currentUsed = Number(selectedV.fuelUsedThisMonth || (maxQuota - currentRemaining));
                const newFuelUsed = Math.max(0, parseFloat((currentUsed - litersToAdd).toFixed(2)));
                const costLkr = Math.round(litersToAdd * 320);

                // 1. Update Vehicle Document in Firestore
                if (selectedV.id && selectedV.id !== 'self_profile') {
                    await db.collection('vehicles').doc(selectedV.id).update({
                        remainingQuota: newRemaining,
                        fuelUsedThisMonth: newFuelUsed,
                        lastRefuelDate: new Date().toISOString(),
                        lastRefuelLiters: litersToAdd
                    });
                }

                // 2. Also update User document for Driver
                if (currentUser.uid) {
                    await db.collection('users').doc(currentUser.uid).update({
                        remainingQuota: newRemaining,
                        fuelUsedThisMonth: newFuelUsed
                    }).catch(() => {});
                }

                // 3. Update memory state & instantly re-render UI
                selectedV.remainingQuota = newRemaining;
                selectedV.fuelUsedThisMonth = newFuelUsed;
                renderFuelStatusCard(selectedV);
                renderVehicleSelectionComplianceBox(selectedV);

                // 4. Add Fuel Log Entry in fuel_logs collection
                await db.collection('fuel_logs').add({
                    vehicleId: selectedV.id || 'self_profile',
                    plateNumber: plate,
                    driverId: currentUser.uid,
                    driverName: currentUser.name || 'Driver',
                    type: 'refuel',
                    liters: litersToAdd,
                    costLkr: costLkr,
                    pricePerLiter: 320,
                    remainingQuotaAfter: newRemaining,
                    date: new Date().toISOString().split('T')[0],
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                // 5. Send Refuel Confirmation Notification
                await db.collection('notifications').add({
                    userId: currentUser.uid,
                    title: "Refuel Successful ⛽",
                    message: `Pumped ${litersToAdd} L (LKR ${costLkr.toLocaleString()}) into ${plate}. Remaining monthly quota is now ${newRemaining} L / ${maxQuota} L.`,
                    type: "refuel_success",
                    read: false,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                refuelModal.classList.remove('active');
                showSuccessModal('Refuel Successful', `Successfully pumped ${litersToAdd} L (LKR ${costLkr.toLocaleString()}). Your vehicle quota has been replenished to ${newRemaining} L / ${maxQuota} L.`);
            } catch (err) {
                console.error("Error processing refuel:", err);
                alert("Failed to process refuel. Please try again.");
            } finally {
                submitBtn.innerHTML = origText;
                submitBtn.disabled = false;
            }
        });
    }

    // --- Refuel History Viewer ---
    if (openRefuelHistoryBtn && refuelHistoryModal) {
        openRefuelHistoryBtn.addEventListener('click', async () => {
            refuelHistoryModal.classList.add('active');
            if (refuelHistoryListContainer) {
                refuelHistoryListContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 25px;"><i class="fa-solid fa-spinner fa-spin me-1"></i> Loading fuel records...</p>';

                try {
                    const snap = await db.collection('fuel_logs')
                        .where('driverId', '==', currentUser.uid)
                        .get();

                    const logs = [];
                    snap.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));

                    logs.sort((a, b) => (b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp || 0)) - (a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp || 0)));

                    if (logs.length === 0) {
                        refuelHistoryListContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 30px;">No refuel or consumption records logged yet.</p>';
                        return;
                    }

                    refuelHistoryListContainer.innerHTML = logs.map(l => {
                        const isRefuel = l.type === 'refuel';
                        const dateStr = l.date || (l.timestamp?.toDate ? l.timestamp.toDate().toLocaleDateString() : 'Recent');
                        return `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: rgba(0,0,0,0.02); border: 1px solid var(--border-color); border-radius: 12px; margin-bottom: 10px; font-size: 0.85rem;">
                            <div>
                                <div style="font-weight: 600; color: ${isRefuel ? 'var(--success-color)' : 'var(--primary-color)'};">
                                    <i class="fa-solid ${isRefuel ? 'fa-gas-pump' : 'fa-route'} me-1"></i> ${isRefuel ? 'Pump Refuel' : 'Ride Consumption'}
                                </div>
                                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                                    ${l.plateNumber || 'Vehicle'} • ${dateStr} ${l.note ? `• ${l.note}` : ''}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: 700; color: var(--text-main);">${isRefuel ? '+' : '-'}${l.liters} L</div>
                                <div style="font-size: 0.78rem; color: var(--text-muted);">LKR ${(l.costLkr || (l.liters * 320)).toLocaleString()}</div>
                            </div>
                        </div>
                        `;
                    }).join('');
                } catch (err) {
                    console.error("Error loading fuel history:", err);
                    refuelHistoryListContainer.innerHTML = '<p style="text-align: center; color: var(--danger-color); padding: 25px;">Failed to load refuel records.</p>';
                }
            }
        });
    }

    if (closeRefuelHistoryModalBtn && refuelHistoryModal) {
        closeRefuelHistoryModalBtn.addEventListener('click', () => refuelHistoryModal.classList.remove('active'));
    }


    // --- 4. Active Rides & Ride History Real-time Listener ---
    const activeRidesContainer = document.getElementById('activeRidesContainer');
    const rideHistoryContainer = document.getElementById('rideHistoryContainer');

    if (activeRidesContainer || rideHistoryContainer) {
        let cachedPubRides = [];
        let cachedCustomRides = [];
        let cachedLegCustomRides = [];

        function updateAllRidesList() {
            const combined = [...cachedPubRides, ...cachedCustomRides, ...cachedLegCustomRides];
            // Remove duplicates
            const uniqueMap = new Map();
            combined.forEach(item => uniqueMap.set(item.id, item));
            const uniqueRides = Array.from(uniqueMap.values());

            // Sort: active/accepted first, then newest
            uniqueRides.sort((a, b) => {
                const aActive = (a.status === 'active' || a.status === 'accepted');
                const bActive = (b.status === 'active' || b.status === 'accepted');
                if (aActive && !bActive) return -1;
                if (!aActive && bActive) return 1;
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.date ? new Date(a.date).getTime() : 0));
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.date ? new Date(b.date).getTime() : 0));
                return timeB - timeA;
            });

            renderRidesList(uniqueRides);
        }

        // 1. Published Rides listener
        db.collection('rides')
            .where('driverId', '==', currentUser.uid)
            .onSnapshot((snapshot) => {
                cachedPubRides = [];
                snapshot.forEach((doc) => {
                    cachedPubRides.push({ id: doc.id, isCustom: false, ...doc.data() });
                });
                updateAllRidesList();
            }, (error) => {
                console.error("Error fetching rides:", error);
            });

        // 2. Custom accepted/completed RideRequests listener
        db.collection('RideRequests')
            .where('driverId', '==', currentUser.uid)
            .onSnapshot((snapshot) => {
                cachedCustomRides = [];
                snapshot.forEach((doc) => {
                    const rData = doc.data();
                    cachedCustomRides.push({
                        id: doc.id,
                        isCustom: true,
                        passengerName: rData.passengerName || 'Passenger',
                        passengerId: rData.passengerId,
                        start: rData.origin || 'Origin',
                        dest: rData.destination || 'Destination',
                        date: rData.date || (rData.timestamp?.toDate ? rData.timestamp.toDate().toLocaleDateString() : ''),
                        time: rData.time || '',
                        price: Number(rData.amount || rData.fare || rData.price || 350),
                        status: rData.status || 'accepted',
                        timestamp: rData.timestamp,
                        ...rData
                    });
                });
                updateAllRidesList();
            }, (error) => {
                console.error("Error fetching custom ride requests:", error);
            });

        // 3. Legacy requests listener
        db.collection('requests')
            .where('driverId', '==', currentUser.uid)
            .onSnapshot((snapshot) => {
                cachedLegCustomRides = [];
                snapshot.forEach((doc) => {
                    const rData = doc.data();
                    cachedLegCustomRides.push({
                        id: doc.id,
                        isCustom: true,
                        passengerName: rData.passengerName || 'Passenger',
                        passengerId: rData.passengerId,
                        start: rData.origin || 'Origin',
                        dest: rData.destination || 'Destination',
                        date: rData.date || '',
                        time: rData.time || '',
                        price: Number(rData.amount || rData.fare || rData.price || 350),
                        status: rData.status || 'accepted',
                        timestamp: rData.timestamp,
                        ...rData
                    });
                });
                updateAllRidesList();
            }, () => {});
    }

    function renderRidesList(ridesData) {
        if (!ridesData || ridesData.length === 0) {
            const emptyMsg = '<p style="color: var(--text-muted); text-align: center; margin-top: 15px; font-size: 0.95rem;">No rides published yet. Use the form to offer a ride!</p>';
            if (activeRidesContainer) activeRidesContainer.innerHTML = emptyMsg;
            if (rideHistoryContainer) rideHistoryContainer.innerHTML = emptyMsg;
            return;
        }

        let html = '';
        ridesData.forEach(ride => {
            const isCustom = ride.isCustom === true;
            const isActive = ride.status === 'active' || (isCustom && ride.status === 'accepted');
            const isCompleted = ride.status === 'completed';
            const isCancelled = ride.status === 'cancelled' || ride.status === 'rejected';

            let statusBadge = `<span class="badge" style="background: rgba(27, 94, 32, 0.12); color: var(--primary-color); font-weight: 600; white-space: nowrap; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem;"><i class="fa-solid fa-circle-dot" style="font-size:0.6rem;"></i> Active ${isCustom ? '(Custom)' : `(${ride.seats || ride.availableSeats || 0} seats left)`}</span>`;
            if (isCompleted) {
                statusBadge = `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--success-color); font-weight: 600; white-space: nowrap; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem;"><i class="fa-solid fa-flag-checkered"></i> Completed</span>`;
            } else if (isCancelled) {
                statusBadge = `<span class="badge" style="background: rgba(239, 68, 68, 0.12); color: var(--danger-color); font-weight: 600; white-space: nowrap; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem;"><i class="fa-solid fa-ban"></i> Cancelled</span>`;
            }

            const originName = ride.start || ride.origin || 'Origin';
            const destName = ride.dest || ride.destination || 'Destination';
            const fareAmount = Number(ride.price || ride.fare || ride.amount || ride.pricePerSeat || 350);

            html += `
                <div class="list-item" style="padding: 14px 16px; border-radius: 14px; margin-bottom: 12px; background: ${isActive ? 'rgba(27,94,32,0.02)' : 'rgba(0,0,0,0.02)'}; border: 1px solid ${isActive ? 'var(--border-color)' : 'rgba(0,0,0,0.08)'};">
                    <div class="list-item-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                        <div style="font-weight: 600; font-size: 0.98rem; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
                            <span>${originName}</span> 
                            <i class="fa-solid fa-arrow-right" style="color: var(--primary-color); font-size: 0.75rem;"></i> 
                            <span>${destName}</span>
                            ${isCustom ? '<span style="font-size:0.72rem; color:var(--primary-color); font-weight:600; background:rgba(27,94,32,0.1); padding:2px 7px; border-radius:6px; margin-left:4px;">Custom Request</span>' : ''}
                        </div>
                        <div style="margin-left: auto;">
                            ${statusBadge}
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 0.82rem; color: var(--text-muted);">
                        <div>
                            <i class="fa-regular fa-calendar" style="margin-right: 3px;"></i> ${ride.date || 'Today'} &nbsp;|&nbsp; 
                            <i class="fa-regular fa-clock" style="margin-right: 3px;"></i> ${ride.time || 'N/A'} &nbsp;|&nbsp;
                            <strong style="color: var(--primary-color);">Rs. ${fareAmount.toLocaleString()}${isCustom ? '' : '/seat'}</strong>
                            ${isCustom && ride.passengerName ? ` &nbsp;|&nbsp; <span><i class="fa-solid fa-user me-1"></i> Passenger: <strong>${ride.passengerName}</strong></span>` : ''}
                        </div>
                    </div>
                    <div style="display: flex; justify-content: flex-end; margin-top: 10px; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <button class="btn btn-sm" style="background: rgba(27,94,32,0.1); color: var(--primary-color); border: 1px solid var(--primary-color); padding: 6px 12px; font-size: 0.8rem;" onclick="window.showRideRouteMap ? window.showRideRouteMap('${originName.replace(/'/g, "\\'")}', '${destName.replace(/'/g, "\\'")}') : null">
                            <i class="fa-solid fa-map-location-dot"></i> View Route Map
                        </button>
                        ${isActive ? (isCustom ? `
                            <button class="btn btn-sm btn-primary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="openChatForPassenger('${ride.passengerId}', '${(ride.passengerName || 'Passenger').replace(/'/g, "\\'")}', '${ride.id}')">
                                <i class="fa-solid fa-comments"></i> Chat
                            </button>
                            <button class="btn btn-sm btn-success" style="background: var(--success-color); color: white; padding: 6px 14px; font-size: 0.8rem;" onclick="completeCustomRequest('${ride.id}')">
                                <i class="fa-solid fa-circle-check"></i> Complete Trip
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-success" style="background: var(--success-color); color: white; padding: 6px 14px; font-size: 0.8rem;" onclick="completeRide('${ride.id}')">
                                <i class="fa-solid fa-circle-check"></i> Complete
                            </button>
                            <button class="btn btn-sm" style="background: rgba(239,68,68,0.1); color: var(--danger-color); border: 1px solid rgba(239,68,68,0.3); padding: 6px 14px; font-size: 0.8rem;" onclick="cancelRide('${ride.id}')">
                                <i class="fa-solid fa-ban"></i> Cancel
                            </button>
                        `) : `
                            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">
                                <i class="fa-solid ${isCompleted ? 'fa-check' : 'fa-info-circle'}"></i> ${isCompleted ? 'Ride completed successfully' : 'Ride was cancelled'}
                            </span>
                        `}
                    </div>
                </div>
            `;
        });

        if (activeRidesContainer) activeRidesContainer.innerHTML = html;
        if (rideHistoryContainer) rideHistoryContainer.innerHTML = html;
    }

    // --- 5. Passenger Requests, Bookings & Payment Earnings Real-time Listener ---
    const passengerRequestsContainer = document.getElementById('passengerRequestsContainer');
    const allRequestsContainer = document.getElementById('allRequestsContainer');
    const totalEarningsEl = document.getElementById('driverTotalEarnings');
    const paidCountEl = document.getElementById('driverPaidPassengersCount');
    const recentPaymentsList = document.getElementById('driverRecentPaymentsList');

    if (currentUser && currentUser.uid && db) {
        db.collection('users').doc(currentUser.uid).onSnapshot(doc => {
            if (doc.exists) {
                const uData = doc.data();
                if (totalEarningsEl) {
                    const earningsVal = Number(uData.totalEarnings !== undefined ? uData.totalEarnings : (uData.walletBalance || 0));
                    totalEarningsEl.innerText = earningsVal.toLocaleString();
                }
            }
        });
    }

    if (passengerRequestsContainer || allRequestsContainer || totalEarningsEl || recentPaymentsList) {
        let cachedBookings = [];
        let cachedRideReqs = [];
        let cachedLegReqs = [];

        function updateEarningsAndRecentPayments() {
            // 1. Filter valid paid bookings (exclude cancelled)
            const paidBookings = cachedBookings.filter(b => {
                const st = (b.status || '').toLowerCase();
                return st !== 'cancelled';
            }).map(b => ({
                id: b.id,
                type: 'booking',
                passengerName: b.passengerName || 'Passenger',
                from: b.rideFrom || 'Origin',
                to: b.rideTo || 'Destination',
                amount: Number(b.amount || 0),
                timestamp: b.timestamp
            }));

            // 2. Filter completed custom ride requests for this driver
            const paidCustom = [...cachedRideReqs, ...cachedLegReqs].filter(r => {
                const st = (r.status || '').toLowerCase();
                return st === 'completed' && r.driverId === currentUser.uid;
            }).map(r => ({
                id: r.id,
                type: 'custom',
                passengerName: r.passengerName || 'Passenger',
                from: r.origin || 'Origin',
                to: r.destination || 'Destination',
                amount: Number(r.amount || r.fare || r.price || 0),
                timestamp: r.completedAt || r.timestamp
            }));

            // Combine and sort by newest first
            const allPaid = [...paidBookings, ...paidCustom];
            allPaid.sort((a, b) => (b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp ? new Date(b.timestamp).getTime() : 0)) - (a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp ? new Date(a.timestamp).getTime() : 0)));

            const paidCount = allPaid.length;
            if (paidCountEl) {
                paidCountEl.innerText = `${paidCount} passenger payment${paidCount === 1 ? '' : 's'} received`;
            }

            if (recentPaymentsList) {
                if (allPaid.length === 0) {
                    recentPaymentsList.innerHTML = '<p style="color: var(--text-muted); text-align: center; font-size: 0.8rem; padding: 10px;">No payments recorded yet.</p>';
                } else {
                    recentPaymentsList.innerHTML = allPaid.slice(0, 5).map(b => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 7px 10px; margin-bottom: 6px; background: rgba(0,0,0,0.02); border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.82rem;">
                            <div>
                                <div style="font-weight: 600; color: #0f172a;">
                                    ${b.passengerName}
                                    ${b.type === 'custom' ? '<span style="font-size:0.68rem; color:var(--primary-color); font-weight:normal; background:rgba(27,94,32,0.08); padding:1px 5px; border-radius:4px; margin-left:3px;">Custom</span>' : ''}
                                </div>
                                <div style="color: var(--text-muted); font-size: 0.75rem;">${b.from} &rarr; ${b.to}</div>
                            </div>
                            <span style="font-weight: 700; color: var(--success-color); font-size: 0.9rem;">Rs. ${Number(b.amount || 0).toLocaleString()}</span>
                        </div>
                    `).join('');
                }
            }

            // 3. Update Requests List in Passenger Requests & Bookings card
            const combinedReqs = [...cachedBookings, ...cachedRideReqs, ...cachedLegReqs];
            const uniqueMap = new Map();
            combinedReqs.forEach(item => uniqueMap.set(item.id, item));
            const uniqueCombined = Array.from(uniqueMap.values());
            uniqueCombined.sort((a, b) => (b.timestamp?.toMillis ? b.timestamp.toMillis() : 0) - (a.timestamp?.toMillis ? a.timestamp.toMillis() : 0));
            renderRequestsList(uniqueCombined);
        }

        // Listen to bookings for this driver
        db.collection('bookings')
            .where('driverId', '==', currentUser.uid)
            .onSnapshot((bookingSnap) => {
                cachedBookings = [];
                bookingSnap.forEach((doc) => {
                    cachedBookings.push({ id: doc.id, type: 'booking', ...doc.data() });
                });
                updateEarningsAndRecentPayments();
            }, (error) => {
                console.error("Error fetching bookings:", error);
            });

        // Listen to RideRequests collection
        db.collection('RideRequests')
            .onSnapshot((reqSnap) => {
                cachedRideReqs = [];
                reqSnap.forEach((doc) => {
                    const reqData = doc.data();
                    if (reqData.status === 'pending' || reqData.driverId === currentUser.uid) {
                        cachedRideReqs.push({ id: doc.id, type: 'request', ...reqData });
                    }
                });
                updateEarningsAndRecentPayments();
            }, (err) => {
                console.error("Error fetching ride requests:", err);
            });

        // Listen to legacy requests collection
        db.collection('requests')
            .onSnapshot((legSnap) => {
                cachedLegReqs = [];
                legSnap.forEach((doc) => {
                    const legData = doc.data();
                    if (legData.status === 'pending' || legData.driverId === currentUser.uid) {
                        cachedLegReqs.push({ id: doc.id, type: 'request', ...legData });
                    }
                });
                updateEarningsAndRecentPayments();
            }, () => {});
    }

    function renderRequestsList(data) {
        if (!data || data.length === 0) {
            const emptyMsg = '<p style="color: var(--text-muted); text-align: center; margin-top: 15px; font-size: 0.95rem;">No passenger requests or bookings yet.</p>';
            if (passengerRequestsContainer) passengerRequestsContainer.innerHTML = emptyMsg;
            if (allRequestsContainer) allRequestsContainer.innerHTML = emptyMsg;
            return;
        }

        let html = '';
        data.forEach(item => {
            const isBooking = item.type === 'booking';
            const passengerName = item.passengerName || 'Passenger';
            const from = item.rideFrom || item.origin || 'Origin';
            const to = item.rideTo || item.destination || 'Destination';
            const date = item.date || (item.timestamp?.toDate ? item.timestamp.toDate().toLocaleDateString() : '');
            const time = item.time || '';

            if (isBooking) {
                const isBookingCompleted = (item.status || '').toLowerCase() === 'completed';
                const isBookingCancelled = (item.status || '').toLowerCase() === 'cancelled';

                html += `
                    <div class="list-item" style="padding: 12px 15px; border-radius: 12px; margin-bottom: 10px; background: ${isBookingCompleted ? 'rgba(16,185,129,0.03)' : (isBookingCancelled ? 'rgba(239,68,68,0.03)' : 'rgba(0,0,0,0.02)')}; border: 1px solid ${isBookingCompleted ? 'rgba(16,185,129,0.2)' : (isBookingCancelled ? 'rgba(239,68,68,0.2)' : 'var(--border-color)')};">
                        <div class="list-item-header" style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="avatar" style="width: 38px; height: 38px; font-size: 1rem; background: ${isBookingCompleted ? 'var(--success-color)' : (isBookingCancelled ? '#94a3b8' : 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))')}; color:#fff;">
                                    ${passengerName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style="font-weight: 600;">
                                        ${passengerName} 
                                        <span style="font-size: 0.75rem; color: var(--primary-color); font-weight: normal; background: rgba(27,94,32,0.1); padding: 2px 6px; border-radius: 6px; margin-left: 4px;">Booked Ride</span>
                                        ${isBookingCompleted ? '<span class="badge ms-2" style="background: rgba(16,185,129,0.15); color: #10b981; font-size: 0.72rem;"><i class="fa-solid fa-circle-check me-1"></i> Trip Completed</span>' : (isBookingCancelled ? '<span class="badge ms-2" style="background: rgba(239,68,68,0.1); color: #ef4444; font-size: 0.72rem;">Cancelled</span>' : '')}
                                    </div>
                                    <div style="font-size: 0.8rem; color: var(--text-muted);">${from} <i class="fa-solid fa-arrow-right" style="font-size:0.7rem;"></i> ${to} ${date ? `| ${date}` : ''}</div>
                                </div>
                            </div>
                            <span class="badge" style="background: ${isBookingCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)'}; color: var(--success-color); font-weight: 600;">Paid Rs. ${Number(item.amount || 350).toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                            <button class="btn btn-sm" style="background: rgba(27,94,32,0.1); color: var(--primary-color); border: 1px solid var(--primary-color); padding: 5px 12px; font-size: 0.8rem;" onclick="window.showRideRouteMap ? window.showRideRouteMap('${from.replace(/'/g, "\\'")}', '${to.replace(/'/g, "\\'")}') : null">
                                <i class="fa-solid fa-map-location-dot"></i> View Route
                            </button>
                            ${!isBookingCompleted && !isBookingCancelled ? `
                                <button class="btn btn-sm btn-primary" onclick="openChatForPassenger('${item.passengerId}', '${passengerName.replace(/'/g, "\\'")}')">
                                    <i class="fa-solid fa-comments"></i> Chat with Passenger
                                </button>
                            ` : `
                                <span class="badge" style="background: rgba(0,0,0,0.05); color: var(--text-muted); padding: 6px 12px; border-radius: 8px; font-size: 0.78rem;">
                                    <i class="fa-solid fa-lock me-1"></i> Trip Finished
                                </span>
                            `}
                        </div>
                    </div>
                `;
            } else {
                // Custom ride request
                const isCompleted = (item.status || '').toLowerCase() === 'completed';
                const isAccepted = (item.status || '').toLowerCase() === 'accepted';
                const isRejected = (item.status || '').toLowerCase() === 'rejected' || (item.status || '').toLowerCase() === 'cancelled';
                const now = Date.now();
                const expiresAt = item.expiresAt || (item.createdAtMs ? item.createdAtMs + 20*60*1000 : (item.timestamp?.toMillis ? item.timestamp.toMillis() + 20*60*1000 : null));
                const remainingSec = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : null;
                const isExpired = item.status === 'expired' || (!isCompleted && !isAccepted && !isRejected && remainingSec !== null && remainingSec <= 0);

                let statusBadge = `<span class="badge" style="background: rgba(255,193,7,0.2); color: #856404; font-weight: 600;">Pending</span>`;
                if (isCompleted) {
                    statusBadge = `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--success-color); font-weight: 600;"><i class="fa-solid fa-circle-check"></i> Completed</span>`;
                } else if (isAccepted) {
                    statusBadge = `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--success-color); font-weight: 600;"><i class="fa-solid fa-circle-check"></i> Accepted by You</span>`;
                } else if (isRejected) {
                    statusBadge = `<span class="badge" style="background: rgba(239, 68, 68, 0.1); color: var(--danger-color); font-weight: 600;"><i class="fa-solid fa-ban"></i> Declined</span>`;
                } else if (isExpired) {
                    statusBadge = `<span class="badge" style="background: rgba(239, 68, 68, 0.12); color: #dc2626; font-weight: 700;"><i class="fa-solid fa-clock-rotate-left me-1"></i> Expired (20m Timeout)</span>`;
                } else if (remainingSec !== null) {
                    const m = Math.floor(remainingSec / 60);
                    const s = remainingSec % 60;
                    const timeStr = `${m}:${s < 10 ? '0' : ''}${s}`;
                    statusBadge = `
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">
                            <span class="badge" style="background: ${remainingSec <= 180 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}; color: ${remainingSec <= 180 ? '#dc2626' : '#b45309'}; font-weight: 700; border: 1px solid ${remainingSec <= 180 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'};">
                                <i class="fa-solid fa-stopwatch me-1"></i> <span id="driver-countdown-${item.id}">${timeStr} left</span>
                            </span>
                            <span style="font-size: 0.7rem; color: var(--text-muted);">20m validity window</span>
                        </div>
                    `;
                }

                html += `
                    <div class="list-item" id="req-card-${item.id}" style="padding: 12px 15px; border-radius: 12px; margin-bottom: 10px; background: ${isCompleted ? 'rgba(16,185,129,0.03)' : (isAccepted ? 'rgba(0,0,0,0.02)' : (isRejected || isExpired ? 'rgba(239,68,68,0.03)' : 'rgba(255,243,205,0.25)'))}; border: 1px solid ${isCompleted ? 'rgba(16,185,129,0.2)' : (isAccepted ? 'var(--border-color)' : (isRejected || isExpired ? 'rgba(239,68,68,0.2)' : '#ffeeba'))};">
                        <div class="list-item-header" style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="avatar" style="width: 38px; height: 38px; font-size: 1rem; background: ${isCompleted ? 'var(--success-color)' : (isAccepted ? 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))' : (isRejected || isExpired ? '#94a3b8' : '#e0a800'))}; color:#fff;">
                                    ${passengerName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style="font-weight: 600;">${passengerName} <span style="font-size: 0.75rem; color: ${isCompleted ? 'var(--success-color)' : (isAccepted ? 'var(--primary-color)' : (isRejected || isExpired ? 'var(--danger-color)' : '#856404'))}; background: ${isCompleted ? 'rgba(16,185,129,0.1)' : (isAccepted ? 'rgba(27,94,32,0.1)' : (isRejected || isExpired ? 'rgba(239,68,68,0.1)' : '#fff3cd'))}; padding: 2px 6px; border-radius: 6px; margin-left: 4px;">Custom Request</span></div>
                                    <div style="font-size: 0.8rem; color: var(--text-muted);">${from} <i class="fa-solid fa-arrow-right" style="font-size:0.7rem;"></i> ${to} | ${date} ${time}</div>
                                </div>
                            </div>
                            ${statusBadge}
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; flex-wrap: wrap;" id="req-actions-${item.id}">
                            <button class="btn btn-sm" style="background: rgba(27,94,32,0.1); color: var(--primary-color); border: 1px solid var(--primary-color); padding: 5px 12px; font-size: 0.8rem;" onclick="window.showRideRouteMap ? window.showRideRouteMap('${from.replace(/'/g, "\\'")}', '${to.replace(/'/g, "\\'")}') : null">
                                <i class="fa-solid fa-map-location-dot"></i> View Route
                            </button>
                            ${isCompleted ? `
                                <span style="font-size: 0.82rem; color: var(--success-color); font-weight: 600; padding: 5px 10px; display: inline-flex; align-items: center; gap: 5px;">
                                    <i class="fa-solid fa-flag-checkered"></i> Trip Finished
                                </span>
                            ` : (isAccepted ? `
                                <button class="btn btn-sm btn-primary" onclick="openChatForPassenger('${item.passengerId}', '${passengerName.replace(/'/g, "\\'")}', '${item.id}')">
                                    <i class="fa-solid fa-comments"></i> Chat with Passenger
                                </button>
                            ` : (isRejected ? `
                                <span style="font-size: 0.8rem; color: var(--danger-color); font-weight: 500;">Request Declined</span>
                            ` : (isExpired ? `
                                <button class="btn btn-sm" disabled style="background: #e2e8f0; color: #94a3b8; border: 1px solid #cbd5e1; cursor: not-allowed; padding: 5px 12px; font-size: 0.8rem;">
                                    <i class="fa-solid fa-lock me-1"></i> Expired (Locked)
                                </button>
                            ` : `
                                <button class="btn btn-sm btn-success" id="btn-accept-${item.id}" onclick="acceptRequest('${item.id}')">
                                    <i class="fa-solid fa-check"></i> Accept
                                </button>
                                <button class="btn btn-sm btn-danger" id="btn-decline-${item.id}" onclick="rejectRequest('${item.id}')">
                                    <i class="fa-solid fa-xmark"></i> Decline
                                </button>
                            `)))}
                        </div>
                    </div>
                `;

                // If timer is running, attach client tick
                if (!isCompleted && !isAccepted && !isRejected && !isExpired && expiresAt) {
                    setTimeout(() => {
                        window.startDriverRequestCountdown(item.id, expiresAt);
                    }, 50);
                }
            }
        });

        if (passengerRequestsContainer) passengerRequestsContainer.innerHTML = html;
        if (allRequestsContainer) allRequestsContainer.innerHTML = html;
    }

    const driverActiveCountdownIntervals = {};
    window.startDriverRequestCountdown = function(reqId, expiresAt) {
        if (driverActiveCountdownIntervals[reqId]) {
            clearInterval(driverActiveCountdownIntervals[reqId]);
        }

        const updateTick = () => {
            const el = document.getElementById(`driver-countdown-${reqId}`);
            if (!el) {
                if (driverActiveCountdownIntervals[reqId]) clearInterval(driverActiveCountdownIntervals[reqId]);
                return;
            }

            const now = Date.now();
            const remSec = Math.max(0, Math.floor((expiresAt - now) / 1000));

            if (remSec <= 0) {
                clearInterval(driverActiveCountdownIntervals[reqId]);
                delete driverActiveCountdownIntervals[reqId];

                // Auto-mark expired in UI
                el.innerText = "0:00 Expired";
                const actionsEl = document.getElementById(`req-actions-${reqId}`);
                if (actionsEl) {
                    const viewRouteBtn = actionsEl.querySelector("button[onclick*='showRideRouteMap']");
                    actionsEl.innerHTML = `
                        ${viewRouteBtn ? viewRouteBtn.outerHTML : ''}
                        <button class="btn btn-sm" disabled style="background: #e2e8f0; color: #94a3b8; border: 1px solid #cbd5e1; cursor: not-allowed; padding: 5px 12px; font-size: 0.8rem;">
                            <i class="fa-solid fa-lock me-1"></i> Expired (Locked)
                        </button>
                    `;
                }

                // Update Firestore
                if (window.db) {
                    window.db.collection('RideRequests').doc(reqId).update({ status: 'expired' }).catch(() => {});
                }
                return;
            }

            const m = Math.floor(remSec / 60);
            const s = remSec % 60;
            el.innerText = `${m}:${s < 10 ? '0' : ''}${s} left`;
        };

        driverActiveCountdownIntervals[reqId] = setInterval(updateTick, 1000);
    };

    // --- 6. Real-time Notifications for Driver (Personal + Custom Ride Requests) ---
    const bellIcon = document.getElementById('bellIcon');
    const bellWrapper = document.getElementById('bellIconWrapper');
    const notifDropdown = document.getElementById('notificationDropdown');
    const notifList = document.getElementById('notificationList');
    const notifBadge = document.getElementById('driverNotificationBadge');

    if ((bellIcon || bellWrapper) && notifDropdown) {
        const toggleTarget = bellWrapper || bellIcon;
        toggleTarget.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!notifDropdown.contains(e.target)) {
                notifDropdown.classList.remove('active');
            }
        });
    }

    if (notifList) {
        let personalNotifs = [];
        let broadcastNotifs = [];
        let pendingRideReqs = [];
        const readReqIds = new Set(JSON.parse(localStorage.getItem(`read_driver_reqs_${currentUser.uid}`) || '[]'));

        function renderAllDriverNotifications() {
            const allItems = [...personalNotifs, ...broadcastNotifs, ...pendingRideReqs];
            
            // Remove duplicates by unique ID
            const seen = new Set();
            const unique = [];
            for (const item of allItems) {
                const key = item.id || `${item.type}_${item.requestId || item.passengerId}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    unique.push(item);
                }
            }

            // Sort newest first
            unique.sort((a, b) => {
                const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : (a.rawTime || 0));
                const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : (b.rawTime || 0));
                return timeB - timeA;
            });

            // Count unread
            const unreadCount = unique.filter(n => !n.read).length;
            if (notifBadge) {
                if (unreadCount > 0) {
                    notifBadge.innerText = unreadCount > 99 ? '99+' : unreadCount;
                    notifBadge.style.display = 'inline-block';
                } else {
                    notifBadge.style.display = 'none';
                }
            }

            if (unique.length === 0) {
                notifList.innerHTML = '<p style="padding: 20px; color: var(--text-muted); text-align: center; font-size: 0.88rem;"><i class="fa-regular fa-bell-slash me-1"></i> No notifications</p>';
                return;
            }

            let html = '';
            unique.slice(0, 15).forEach(n => {
                const isRideReq = n.type === 'custom_ride_request' || n.isCustomRequest;
                const iconClass = isRideReq ? 'fa-solid fa-car-side' : (n.type === 'fuel_alert' ? 'fa-solid fa-gas-pump' : 'fa-solid fa-bell');
                const iconColor = isRideReq ? 'var(--primary-color)' : (n.type === 'fuel_alert' ? '#f59e0b' : 'var(--primary-color)');
                const bgColor = n.read ? 'transparent' : 'rgba(27,94,32,0.06)';
                const tagBadge = isRideReq ? '<span class="badge" style="background: rgba(16,185,129,0.15); color: var(--success-color); font-size: 0.68rem; padding: 2px 6px; border-radius: 6px; margin-left: 6px;">New Request</span>' : '';

                html += `
                    <div class="notification-item" style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); display: flex; gap: 12px; cursor: pointer; background: ${bgColor}; align-items: flex-start; transition: background 0.2s;" onclick="handleDriverNotifClick('${n.id || ''}', '${n.requestId || ''}', '${n.type || ''}')">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(27,94,32,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
                            <i class="${iconClass}" style="color: ${iconColor}; font-size: 0.9rem;"></i>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 700; font-size: 0.86rem; color: #1e293b; display: flex; align-items: center;">
                                <span>${n.title || 'Update'}</span>
                                ${tagBadge}
                            </div>
                            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 3px; line-height: 1.35; word-break: break-word;">${n.message || ''}</div>
                            <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 4px;">${n.timeAgo || 'Just now'}</div>
                        </div>
                    </div>
                `;
            });
            notifList.innerHTML = html;
        }

        // 1. Personal driver notifications
        db.collection('notifications')
            .where('userId', '==', currentUser.uid)
            .onSnapshot((snap) => {
                personalNotifs = [];
                snap.forEach(doc => personalNotifs.push({ id: doc.id, ...doc.data() }));
                renderAllDriverNotifications();
            }, (err) => console.warn("Personal notif error:", err));

        // 2. Broadcast driver notifications
        db.collection('notifications')
            .where('targetRole', '==', 'driver')
            .onSnapshot((snap) => {
                broadcastNotifs = [];
                snap.forEach(doc => {
                    const d = doc.data();
                    const isRead = readReqIds.has(doc.id) || d.read;
                    broadcastNotifs.push({ id: doc.id, read: isRead, ...d });
                });
                renderAllDriverNotifications();
            }, (err) => console.warn("Broadcast notif error:", err));

        // 3. Real-time Pending Custom Ride Requests
        db.collection('RideRequests')
            .where('status', '==', 'pending')
            .onSnapshot((snap) => {
                pendingRideReqs = [];
                snap.forEach(doc => {
                    const req = doc.data();
                    const isRead = readReqIds.has(doc.id);
                    const origin = req.origin || 'Origin';
                    const dest = req.destination || 'Destination';
                    const pName = req.passengerName || 'Passenger';
                    const dateStr = req.date || 'Today';
                    const timeStr = req.time || '';

                    pendingRideReqs.push({
                        id: `req_${doc.id}`,
                        requestId: doc.id,
                        isCustomRequest: true,
                        type: 'custom_ride_request',
                        title: '🚗 Custom Ride Request',
                        message: `${pName} requested a ride: ${origin} → ${dest} on ${dateStr} ${timeStr}`,
                        read: isRead,
                        timestamp: req.timestamp || { toMillis: () => Date.now() },
                        rawTime: req.timestamp?.toDate ? req.timestamp.toDate().getTime() : Date.now()
                    });
                });
                renderAllDriverNotifications();
            }, (err) => console.warn("RideRequests notif listener error:", err));

        // Start In-App Notification Overlay Live Listener for Driver
        if (window.InAppNotificationService && db && currentUser && currentUser.uid) {
            window.InAppNotificationService.startLiveListener(db, currentUser.uid, 'driver');
        }
    }

    window.handleDriverNotifClick = function(notifId, reqId, notifType) {
        if (notifId) {
            if (notifId.startsWith('req_')) {
                const rawId = notifId.replace('req_', '');
                const readSet = new Set(JSON.parse(localStorage.getItem(`read_driver_reqs_${currentUser.uid}`) || '[]'));
                readSet.add(rawId);
                localStorage.setItem(`read_driver_reqs_${currentUser.uid}`, JSON.stringify(Array.from(readSet)));
            } else {
                db.collection('notifications').doc(notifId).update({ read: true }).catch(() => {});
                const readSet = new Set(JSON.parse(localStorage.getItem(`read_driver_reqs_${currentUser.uid}`) || '[]'));
                readSet.add(notifId);
                localStorage.setItem(`read_driver_reqs_${currentUser.uid}`, JSON.stringify(Array.from(readSet)));
            }
        }

        // Close dropdown
        if (notifDropdown) notifDropdown.classList.remove('active');

        // Navigate or scroll to passenger request
        if (notifType === 'custom_ride_request' || reqId) {
            const reqSection = document.getElementById('passengerRequests') || document.getElementById('allRequests');
            if (reqSection) {
                reqSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                window.location.href = 'requests.html';
            }
        }
    };

    window.markDriverNotificationRead = function(notifId) {
        window.handleDriverNotifClick(notifId, null, null);
    };

    // --- 8. Profile Modal on Dashboard (driver_dashboard.html) ---
    const profileModal = document.getElementById('profileModal');
    const avatarTrigger = document.getElementById('avatarInitials');
    const nameTrigger = document.getElementById('profileTriggerText');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const editProfileForm = document.getElementById('editProfileForm');

    function openProfileModal() {
        if (!profileModal) return;
        profileModal.classList.add('active');

        // Pre-fill fields
        const userRaw = localStorage.getItem('loggedInUser');
        const userObj = userRaw ? JSON.parse(userRaw) : currentUser;

        const editName = document.getElementById('editNameInput');
        const editVehicle = document.getElementById('editVehicleInput');
        const editPlate = document.getElementById('editPlateInput');
        const editSeats = document.getElementById('editSeatsInput');

        if (editName) editName.value = userObj.name || userObj.fullName || '';
        if (editVehicle) editVehicle.value = userObj.vehicleModel || '';
        if (editPlate) editPlate.value = userObj.plateNumber || '';
        if (editSeats) editSeats.value = userObj.availableSeats || 3;
    }

    if (avatarTrigger) avatarTrigger.addEventListener('click', openProfileModal);
    if (nameTrigger) nameTrigger.addEventListener('click', openProfileModal);

    function closeProfileModal() {
        if (profileModal) profileModal.classList.remove('active');
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeProfileModal);
    if (profileModal) {
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) closeProfileModal();
        });
    }

    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newName = document.getElementById('editNameInput').value.trim();
            const newVehicle = document.getElementById('editVehicleInput').value.trim();
            const newPlate = document.getElementById('editPlateInput').value.trim();
            const newSeats = parseInt(document.getElementById('editSeatsInput').value) || 3;

            try {
                await db.collection('users').doc(currentUser.uid).update({
                    name: newName,
                    fullName: newName,
                    vehicleModel: newVehicle,
                    plateNumber: newPlate,
                    availableSeats: newSeats,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Update session
                const updated = { ...currentUser, name: newName, vehicleModel: newVehicle, plateNumber: newPlate, availableSeats: newSeats };
                localStorage.setItem('loggedInUser', JSON.stringify(updated));

                closeProfileModal();
                showSuccessModal('Profile Updated', 'Your vehicle and driver profile details have been saved.');
            } catch (error) {
                console.error("Error updating profile:", error);
                alert("Failed to save changes. Please try again.");
            }
        });
    }

    // --- 9. Profile Page Form Submission (profile.html) ---
    const editProfileFormMain = document.getElementById('editProfileFormMain');
    if (editProfileFormMain) {
        editProfileFormMain.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullName = document.getElementById('profileFullName').value.trim();
            const phoneNumber = document.getElementById('profilePhone').value.trim();
            const vehicleModel = document.getElementById('profileVehicle').value.trim();
            const plateNumber = document.getElementById('profilePlate').value.trim();

            const saveBtn = document.getElementById('saveProfileBtn');
            const origText = saveBtn ? saveBtn.innerHTML : '';
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
                saveBtn.disabled = true;
            }

            try {
                await db.collection('users').doc(currentUser.uid).update({
                    name: fullName,
                    fullName: fullName,
                    phone: phoneNumber,
                    phoneNumber: phoneNumber,
                    vehicleModel: vehicleModel,
                    plateNumber: plateNumber,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Update local storage
                const updated = { ...currentUser, name: fullName, phone: phoneNumber, vehicleModel: vehicleModel, plateNumber: plateNumber };
                localStorage.setItem('loggedInUser', JSON.stringify(updated));

                showSuccessModal('Profile Saved', 'Your profile and vehicle information have been updated.');
            } catch (error) {
                console.error("Error saving profile details:", error);
                alert("Failed to update profile.");
            } finally {
                if (saveBtn) {
                    saveBtn.innerHTML = origText;
                    saveBtn.disabled = false;
                }
            }
        });
    }

    // --- 10. Document & Profile Photo Uploading via Firebase Storage (profile.html) ---
    const avatarInput = document.getElementById('avatarInput');
    const avatarStatus = document.getElementById('avatarStatus');
    const dlInput = document.getElementById('dlInput');
    const vrInput = document.getElementById('vrInput');
    const dlStatus = document.getElementById('dlStatus');
    const vrStatus = document.getElementById('vrStatus');

    if (avatarInput && avatarStatus) {
        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            avatarStatus.innerHTML = '<span style="color: var(--primary-color);"><i class="fa-solid fa-spinner fa-spin"></i> Uploading photo...</span>';

            try {
                let downloadUrl = '';
                if (storage) {
                    const storageRef = storage.ref(`driver-avatars/${currentUser.uid}_${Date.now()}`);
                    await storageRef.put(file);
                    downloadUrl = await storageRef.getDownloadURL();
                } else {
                    const reader = new FileReader();
                    downloadUrl = await new Promise((resolve) => {
                        reader.onload = (evt) => resolve(evt.target.result);
                        reader.readAsDataURL(file);
                    });
                }

                await db.collection('users').doc(currentUser.uid).update({
                    profilePicUrl: downloadUrl,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                const updated = { ...currentUser, profilePicUrl: downloadUrl };
                localStorage.setItem('loggedInUser', JSON.stringify(updated));
                updateAvatarAndHeader(updated);

                avatarStatus.innerHTML = '<span style="color: var(--success-color); font-weight: 500;"><i class="fa-solid fa-circle-check"></i> Profile photo updated</span>';
                showSuccessModal('Photo Uploaded', 'Your driver profile picture has been updated successfully.');
            } catch (error) {
                console.error("Error uploading profile photo:", error);
                avatarStatus.innerHTML = '<span style="color: var(--danger-color);"><i class="fa-solid fa-circle-exclamation"></i> Photo upload failed.</span>';
            }
        });
    }

    async function handleDocUpload(inputElement, statusElement, docField) {
        if (!inputElement || !statusElement) return;

        inputElement.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            statusElement.innerHTML = '<span style="color: var(--primary-color);"><i class="fa-solid fa-spinner fa-spin"></i> Uploading document...</span>';

            try {
                let downloadUrl = '';

                if (storage) {
                    const storageRef = storage.ref(`driver-docs/${currentUser.uid}/${docField}_${Date.now()}`);
                    await storageRef.put(file);
                    downloadUrl = await storageRef.getDownloadURL();
                } else {
                    // Fallback
                    const reader = new FileReader();
                    downloadUrl = await new Promise((resolve) => {
                        reader.onload = (evt) => resolve(evt.target.result);
                        reader.readAsDataURL(file);
                    });
                }

                await db.collection('users').doc(currentUser.uid).update({
                    [docField + 'Url']: downloadUrl,
                    [docField + 'Status']: 'Uploaded - Pending Verification',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                statusElement.innerHTML = '<span style="color: var(--success-color); font-weight: 500;"><i class="fa-solid fa-circle-check"></i> Uploaded successfully (Pending Verification)</span>';
                showSuccessModal('Document Uploaded', 'Your document was uploaded and is now being verified by the admin.');
            } catch (error) {
                console.error(`Error uploading ${docField}:`, error);
                statusElement.innerHTML = '<span style="color: var(--danger-color);"><i class="fa-solid fa-circle-exclamation"></i> Upload failed. Try again.</span>';
            }
        });
    }

    handleDocUpload(dlInput, dlStatus, 'drivingLicense');
    handleDocUpload(vrInput, vrStatus, 'vehicleReg');

    // Dashboard modal doc inputs
    const modalDlInput = document.getElementById('modalDlInput');
    const modalDlStatus = document.getElementById('modalDlStatus');
    const modalVrInput = document.getElementById('modalVrInput');
    const modalVrStatus = document.getElementById('modalVrStatus');

    handleDocUpload(modalDlInput, modalDlStatus, 'drivingLicense');
    handleDocUpload(modalVrInput, modalVrStatus, 'vehicleReg');

    // --- 11. Success Modal Close Button ---
    const successModalBtn = document.getElementById('successModalBtn');
    const successModal = document.getElementById('successModal');
    if (successModalBtn && successModal) {
        successModalBtn.addEventListener('click', () => {
            successModal.classList.remove('active');
        });
    }
});
