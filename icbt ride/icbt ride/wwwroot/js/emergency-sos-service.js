/**
 * ICBT Ride - Emergency SOS & Rescue Service
 * Manages breakdown alerts, emergency broadcasting, and passenger rescue transfers.
 */

(function () {
    // 1. Ensure CSS Styles for SOS Modal & Rescue Banners
    function injectEmergencyStyles() {
        if (document.getElementById('icbt-emergency-sos-styles')) return;
        const style = document.createElement('style');
        style.id = 'icbt-emergency-sos-styles';
        style.innerHTML = `
            /* Floating SOS Button (Positioned cleanly above Chat button) */
            .icbt-sos-floating-btn {
                position: fixed;
                bottom: 155px;
                right: 25px;
                background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
                color: #ffffff !important;
                border: none;
                border-radius: 50%;
                width: 56px;
                height: 56px;
                font-size: 1.35rem;
                box-shadow: 0 6px 20px rgba(220, 38, 38, 0.45);
                cursor: pointer;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
                animation: sosPulseGlow 2.5s infinite;
            }
            .icbt-sos-floating-btn:hover {
                transform: scale(1.12);
                box-shadow: 0 8px 25px rgba(220, 38, 38, 0.6);
            }
            @keyframes sosPulseGlow {
                0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.6); }
                70% { box-shadow: 0 0 0 16px rgba(220, 38, 38, 0); }
                100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
            }

            /* SOS Modal Overlay */
            .icbt-sos-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(15, 23, 42, 0.75);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 1000000;
                padding: 16px;
                box-sizing: border-box;
                animation: sosFadeIn 0.25s ease-out;
            }
            @keyframes sosFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .icbt-sos-modal-card {
                background: #ffffff;
                max-width: 480px;
                width: 100%;
                border-radius: 24px;
                padding: 28px 24px;
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);
                border: 2px solid rgba(220, 38, 38, 0.3);
                text-align: center;
                animation: sosPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            @keyframes sosPop {
                from { transform: scale(0.92); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            .icbt-sos-type-btn {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                background: #f8fafc;
                border: 1.5px solid #e2e8f0;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                text-align: left;
                width: 100%;
                margin-bottom: 8px;
                font-family: inherit;
            }
            .icbt-sos-type-btn:hover {
                border-color: #dc2626;
                background: rgba(220, 38, 38, 0.05);
            }
            .icbt-sos-type-btn.active {
                border-color: #dc2626;
                background: rgba(220, 38, 38, 0.1);
            }

            /* Rescue Alert Banner on Driver Dashboard */
            .icbt-rescue-alert-banner {
                background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%);
                color: #ffffff;
                border-radius: 18px;
                padding: 20px;
                margin-bottom: 24px;
                box-shadow: 0 10px 30px rgba(185, 28, 28, 0.35);
                border: 1px solid rgba(254, 202, 202, 0.3);
                animation: rescuePulse 2s infinite alternate ease-in-out;
            }
            @keyframes rescuePulse {
                from { box-shadow: 0 10px 30px rgba(185, 28, 28, 0.3); }
                to { box-shadow: 0 12px 35px rgba(220, 38, 38, 0.6); }
            }
        `;
        document.head.appendChild(style);
    }

    // 2. Inject SOS Modal DOM into Body
    function injectEmergencyModalHtml() {
        if (document.getElementById('icbtEmergencySosModal')) return;

        const modalDiv = document.createElement('div');
        modalDiv.id = 'icbtEmergencySosModal';
        modalDiv.className = 'icbt-sos-modal-overlay';
        modalDiv.innerHTML = `
            <div class="icbt-sos-modal-card">
                <div style="width: 68px; height: 68px; border-radius: 50%; background: rgba(220,38,38,0.12); color: #dc2626; display: inline-flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 14px;">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <h2 style="color: #991b1b; font-size: 1.35rem; font-weight: 800; margin-bottom: 6px;">Emergency SOS & Rescue</h2>
                <p style="color: #64748b; font-size: 0.85rem; line-height: 1.45; margin-bottom: 18px;">
                    Report an active accident or breakdown. Campus security desk and all nearby campus drivers will receive immediate rescue alerts to assist your passengers.
                </p>

                <div style="margin-bottom: 16px; text-align: left;">
                    <label style="font-size: 0.78rem; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 6px; display: block;">Select Incident Type:</label>
                    <button type="button" class="icbt-sos-type-btn active" data-type="Vehicle Breakdown / Mechanical Failure">
                        <i class="fa-solid fa-wrench" style="color: #dc2626; font-size: 1.2rem; width: 24px;"></i>
                        <div>
                            <div style="font-weight: 700; font-size: 0.88rem; color: #1e293b;">Vehicle Breakdown / Tyre Issue</div>
                            <div style="font-size: 0.74rem; color: #64748b;">Engine stalled, flat tyre, or mechanical trouble</div>
                        </div>
                    </button>
                    <button type="button" class="icbt-sos-type-btn" data-type="Road Accident / Collision">
                        <i class="fa-solid fa-car-burst" style="color: #dc2626; font-size: 1.2rem; width: 24px;"></i>
                        <div>
                            <div style="font-weight: 700; font-size: 0.88rem; color: #1e293b;">Road Accident / Collision</div>
                            <div style="font-size: 0.74rem; color: #64748b;">Collision on route, vehicle damaged</div>
                        </div>
                    </button>
                    <button type="button" class="icbt-sos-type-btn" data-type="Medical Emergency / Safety Alert">
                        <i class="fa-solid fa-heart-pulse" style="color: #dc2626; font-size: 1.2rem; width: 24px;"></i>
                        <div>
                            <div style="font-weight: 700; font-size: 0.88rem; color: #1e293b;">Medical Emergency / Unwell</div>
                            <div style="font-size: 0.74rem; color: #64748b;">Sudden illness or safety concern</div>
                        </div>
                    </button>
                </div>

                <div style="margin-bottom: 18px; text-align: left;">
                    <label style="font-size: 0.78rem; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 6px; display: block;">Location / Checkpoint Details:</label>
                    <input type="text" id="icbtSosLocationInput" placeholder="e.g. Near Peradeniya Junction / Katugastota Bridge" style="width: 100%; padding: 10px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 0.88rem; box-sizing: border-box;">
                </div>

                <div style="display: flex; gap: 10px;">
                    <button type="button" class="btn" style="flex: 1; padding: 11px; border: 1px solid #cbd5e1; border-radius: 12px; font-weight: 600; color: #475569; background: #ffffff;" onclick="window.closeEmergencySosModal()">Cancel</button>
                    <button type="button" id="icbtSosSubmitBtn" class="btn" style="flex: 1.4; padding: 11px; background: #dc2626; color: #ffffff; border: none; border-radius: 12px; font-weight: 700;" onclick="window.submitEmergencySos()">
                        <i class="fa-solid fa-bullhorn me-1"></i> Broadcast SOS
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);

        // Click handlers for type selection
        modalDiv.querySelectorAll('.icbt-sos-type-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                modalDiv.querySelectorAll('.icbt-sos-type-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }

    // 3. Open/Close Modal
    let currentSosContext = null;

    window.openEmergencySosModal = function (context = {}) {
        currentSosContext = context;
        injectEmergencyStyles();
        injectEmergencyModalHtml();

        const locInput = document.getElementById('icbtSosLocationInput');
        if (locInput) {
            locInput.value = context.location || context.start || '';
        }

        // Try getting GPS coordinates automatically
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                if (currentSosContext) {
                    currentSosContext.latitude = pos.coords.latitude;
                    currentSosContext.longitude = pos.coords.longitude;
                }
            }, () => {});
        }

        const modal = document.getElementById('icbtEmergencySosModal');
        if (modal) modal.style.display = 'flex';
    };

    window.closeEmergencySosModal = function () {
        const modal = document.getElementById('icbtEmergencySosModal');
        if (modal) modal.style.display = 'none';
    };

    // 4. Submit Emergency SOS & Broadcast to All Campus Drivers
    window.submitEmergencySos = async function () {
        const submitBtn = document.getElementById('icbtSosSubmitBtn');
        const activeTypeBtn = document.querySelector('.icbt-sos-type-btn.active');
        const locInput = document.getElementById('icbtSosLocationInput');

        const incidentType = activeTypeBtn ? activeTypeBtn.getAttribute('data-type') : 'Vehicle Breakdown';
        const locationDesc = (locInput?.value || '').trim() || 'Active Route Location';

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Broadcasting...';
        }

        try {
            const db = window.db || (window.firebase && window.firebase.firestore && window.firebase.firestore());
            if (!db) throw new Error("Firestore not initialized");

            const rawUser = localStorage.getItem('loggedInUser') || localStorage.getItem('loggedInUser_driver') || localStorage.getItem('loggedInUser_passenger');
            const currentUser = rawUser ? JSON.parse(rawUser) : { uid: 'anon', name: 'Campus User' };

            // 1. Create Incident Record in Firestore
            const incidentRef = db.collection('emergency_incidents').doc();
            const incidentData = {
                id: incidentRef.id,
                reporterId: currentUser.uid || '',
                reporterName: currentUser.name || 'User',
                reporterRole: currentUser.role || (currentSosContext?.role || 'driver'),
                reporterPhone: currentUser.phone || '',
                incidentType: incidentType,
                breakdownLocation: locationDesc,
                origin: currentSosContext?.origin || currentSosContext?.start || 'Origin',
                destination: currentSosContext?.destination || currentSosContext?.dest || 'ICBT Campus',
                rideId: currentSosContext?.rideId || '',
                status: 'active_rescue_needed',
                latitude: currentSosContext?.latitude || null,
                longitude: currentSosContext?.longitude || null,
                fareReward: Number(currentSosContext?.fareReward || currentSosContext?.amount || 350),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            await incidentRef.set(incidentData);

            // 2. Create Broadcast in 'rescue_requests' for other campus drivers
            const rescueRef = db.collection('rescue_requests').doc();
            const rescueData = {
                id: rescueRef.id,
                incidentId: incidentRef.id,
                originalDriverId: currentUser.uid || '',
                originalDriverName: currentUser.name || 'Driver in Trouble',
                originalDriverPhone: currentUser.phone || '',
                passengerName: currentSosContext?.passengerName || 'Campus Passenger',
                passengerPhone: currentSosContext?.passengerPhone || '',
                passengerId: currentSosContext?.passengerId || '',
                origin: locationDesc,
                destination: currentSosContext?.destination || currentSosContext?.dest || 'ICBT Campus',
                incidentType: incidentType,
                fareReward: Number(currentSosContext?.fareReward || currentSosContext?.amount || 350),
                status: 'open_for_rescue',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            await rescueRef.set(rescueData);

            // 3. Mark original ride as 'breakdown_emergency' if applicable
            if (currentSosContext?.rideId) {
                await db.collection('rides').doc(currentSosContext.rideId).update({
                    status: 'breakdown_emergency',
                    sosReportedAt: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(() => {});
            }

            // 4. Send High-Priority Push/In-App Notification to ALL DRIVERS
            const notifBatch = db.batch();

            // Broad broadcast notification record for all drivers
            const broadNotifRef = db.collection('notifications').doc();
            notifBatch.set(broadNotifRef, {
                targetRole: 'driver',
                title: "🚨 URGENT RESCUE PICKUP NEEDED!",
                message: `Driver ${currentUser.name} reported ${incidentType} at ${locationDesc}. Stranded passenger needs pickup to ${rescueData.destination}. Reward: Rs. ${rescueData.fareReward}!`,
                type: "emergency_rescue_alert",
                rescueId: rescueRef.id,
                incidentId: incidentRef.id,
                read: false,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Also notify Admin / Campus Security
            const adminNotifRef = db.collection('notifications').doc();
            notifBatch.set(adminNotifRef, {
                targetRole: 'admin',
                title: `🚨 EMERGENCY SOS: ${incidentType}`,
                message: `Incident reported by ${currentUser.name} (${currentUser.role}) at ${locationDesc}. Route: ${incidentData.origin} ➔ ${incidentData.destination}.`,
                type: "emergency_sos_admin",
                incidentId: incidentRef.id,
                read: false,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // If passenger is identified, notify passenger about dispatching rescue
            if (currentSosContext?.passengerId) {
                const passNotifRef = db.collection('notifications').doc();
                notifBatch.set(passNotifRef, {
                    userId: currentSosContext.passengerId,
                    title: "🚨 Breakdown Assistance Dispatched",
                    message: `Your driver reported a vehicle issue at ${locationDesc}. We have broadcasted an emergency rescue request to all nearby campus drivers to pick you up!`,
                    type: "rescue_dispatched",
                    rescueId: rescueRef.id,
                    read: false,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            await notifBatch.commit();

            window.closeEmergencySosModal();

            if (window.showAppAlert) {
                window.showAppAlert({
                    title: "🚨 Emergency SOS Broadcasted!",
                    message: `All campus drivers and emergency admin desk have been alerted. Other drivers on this route are receiving the Rescue Pickup request to take over the passenger.`,
                    type: "warning"
                });
            } else {
                alert(`Emergency SOS Broadcasted! All campus drivers have been notified to assist.`);
            }
        } catch (error) {
            console.error("Error submitting Emergency SOS:", error);
            alert("Failed to send SOS broadcast. Please check internet connection.");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-bullhorn me-1"></i> Broadcast SOS';
            }
        }
    };

    // 5. Driver Accepts Emergency Rescue Pickup
    window.acceptEmergencyRescue = async function (rescueId) {
        try {
            const db = window.db || (window.firebase && window.firebase.firestore && window.firebase.firestore());
            if (!db) return;

            const rawUser = localStorage.getItem('loggedInUser') || localStorage.getItem('loggedInUser_driver');
            const rescueDriver = rawUser ? JSON.parse(rawUser) : null;
            if (!rescueDriver || !rescueDriver.uid) {
                alert("Please log in as a driver first.");
                return;
            }

            const isConfirmed = confirm("Accept Emergency Rescue Pickup?\n\nYou will pick up the stranded campus passenger and receive the full remaining fare payout upon completing the trip.");
            if (!isConfirmed) return;

            const rescueRef = db.collection('rescue_requests').doc(rescueId);
            const rDoc = await rescueRef.get();
            if (!rDoc.exists) {
                alert("Rescue request is no longer available.");
                return;
            }

            const rData = rDoc.data();
            if (rData.status !== 'open_for_rescue') {
                alert("Another driver has already accepted this rescue pickup.");
                return;
            }

            await rescueRef.update({
                status: 'rescue_accepted',
                rescueDriverId: rescueDriver.uid,
                rescueDriverName: rescueDriver.name || 'Rescue Driver',
                rescueDriverPhone: rescueDriver.phone || '',
                acceptedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update incident
            if (rData.incidentId) {
                await db.collection('emergency_incidents').doc(rData.incidentId).update({
                    status: 'rescue_in_progress',
                    rescueDriverId: rescueDriver.uid,
                    rescueDriverName: rescueDriver.name || 'Rescue Driver'
                }).catch(() => {});
            }

            // Notify passenger in real-time
            if (rData.passengerId) {
                await db.collection('notifications').add({
                    userId: rData.passengerId,
                    title: "🚙 Rescue Driver is on the Way!",
                    message: `Driver ${rescueDriver.name || 'A campus driver'} has accepted the rescue request and is heading to your location (${rData.origin}) to complete your trip to ${rData.destination}.`,
                    type: "rescue_driver_en_route",
                    rescueId: rescueId,
                    rescueDriverId: rescueDriver.uid,
                    read: false,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            if (window.showAppAlert) {
                window.showAppAlert({
                    title: "Rescue Accepted! 🚙",
                    message: `You are now assigned to rescue ${rData.passengerName || 'the passenger'} at ${rData.origin}. Proceed to pick up point.`,
                    type: "success"
                });
            } else {
                alert(`Rescue Accepted! Please navigate to ${rData.origin} to pick up ${rData.passengerName || 'the passenger'}.`);
            }
        } catch (err) {
            console.error("Error accepting rescue request:", err);
            alert("Failed to accept rescue request.");
        }
    };

    // 6. Complete Emergency Rescue Trip & Payout to Rescue Driver
    window.completeEmergencyRescueTrip = async function (rescueId) {
        try {
            const db = window.db || (window.firebase && window.firebase.firestore && window.firebase.firestore());
            if (!db) return;

            const rawUser = localStorage.getItem('loggedInUser') || localStorage.getItem('loggedInUser_driver');
            const rescueDriver = rawUser ? JSON.parse(rawUser) : null;
            if (!rescueDriver || !rescueDriver.uid) return;

            const isConfirmed = confirm("Complete Rescue Trip?\n\nConfirm you have dropped off the passenger safely at their destination. The rescue fare reward will be credited to your wallet.");
            if (!isConfirmed) return;

            const rescueRef = db.collection('rescue_requests').doc(rescueId);
            const rDoc = await rescueRef.get();
            const rData = rDoc.exists ? rDoc.data() : {};
            const fareReward = Number(rData.fareReward || 350);

            await rescueRef.update({
                status: 'rescue_completed',
                completedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            if (rData.incidentId) {
                await db.collection('emergency_incidents').doc(rData.incidentId).update({
                    status: 'resolved_safely',
                    resolvedAt: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(() => {});
            }

            // Credit Rescue Driver Wallet
            await db.collection('users').doc(rescueDriver.uid).update({
                walletBalance: firebase.firestore.FieldValue.increment(fareReward),
                totalEarnings: firebase.firestore.FieldValue.increment(fareReward),
                totalRides: firebase.firestore.FieldValue.increment(1)
            });

            // Notify passenger
            if (rData.passengerId) {
                await db.collection('notifications').add({
                    userId: rData.passengerId,
                    title: "🎉 You Have Arrived Safely!",
                    message: `Your emergency rescue trip to ${rData.destination} was completed safely by driver ${rescueDriver.name}. Thank you for riding with ICBT Ride!`,
                    type: "ride_completed",
                    read: false,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            if (window.showAppAlert) {
                window.showAppAlert({
                    title: "Rescue Trip Completed! 🎉",
                    message: `Passenger safely delivered to ${rData.destination}. Rs. ${fareReward.toLocaleString()} has been credited to your driver wallet. Thank you for your campus community support!`,
                    type: "success"
                });
            } else {
                alert(`Rescue Trip Completed! Rs. ${fareReward.toLocaleString()} credited to your wallet.`);
            }
        } catch (err) {
            console.error("Error completing rescue trip:", err);
        }
    };

    // 7. Auto-inject floating SOS Button if not present
    document.addEventListener('DOMContentLoaded', () => {
        injectEmergencyStyles();
        injectEmergencyModalHtml();

        // Check if floating button already exists
        if (!document.getElementById('icbtFloatingSosBtn') && !document.getElementById('sosButton')) {
            const floatBtn = document.createElement('button');
            floatBtn.id = 'icbtFloatingSosBtn';
            floatBtn.className = 'icbt-sos-floating-btn';
            floatBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
            floatBtn.title = 'Emergency SOS & Breakdown Rescue';
            floatBtn.onclick = () => window.openEmergencySosModal();
            document.body.appendChild(floatBtn);
        } else {
            const existingBtn = document.getElementById('sosButton');
            if (existingBtn) {
                existingBtn.onclick = () => window.openEmergencySosModal();
            }
        }
    });
})();
