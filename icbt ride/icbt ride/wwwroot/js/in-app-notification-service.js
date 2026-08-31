/**
 * ICBT Ride - In-App Notification Service
 * Handles real-time slide-in alert overlays and audio cues.
 */

(function () {
    if (window.InAppNotificationService) return;

    class InAppNotificationService {
        constructor() {
            this.container = null;
            this.initialized = false;
            this.activeToasts = new Map();
            this.init();
        }

        init() {
            if (this.container) return;
            this.injectStyles();
            this.container = document.createElement('div');
            this.container.id = 'inAppNotificationContainer';
            this.container.className = 'in-app-notif-container';
            document.body.appendChild(this.container);
            this.initialized = true;
        }

        injectStyles() {
            if (document.getElementById('inAppNotificationStyles')) return;
            const style = document.createElement('style');
            style.id = 'inAppNotificationStyles';
            style.textContent = `
                .in-app-notif-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 999999;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    max-width: 380px;
                    width: calc(100% - 40px);
                    pointer-events: none;
                }
                .in-app-notif-card {
                    pointer-events: auto;
                    background: rgba(255, 255, 255, 0.96);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(27, 94, 32, 0.2);
                    border-left: 5px solid #1B5E20;
                    border-radius: 14px;
                    box-shadow: 0 12px 35px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0,0,0,0.06);
                    padding: 14px 16px;
                    color: #1e293b;
                    font-family: 'Poppins', 'Outfit', sans-serif;
                    transform: translateX(120%);
                    opacity: 0;
                    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
                    position: relative;
                    overflow: hidden;
                }
                .in-app-notif-card.show {
                    transform: translateX(0);
                    opacity: 1;
                }
                .in-app-notif-card.hide {
                    transform: translateX(120%);
                    opacity: 0;
                }
                .in-app-notif-card.sos {
                    border-left-color: #dc2626;
                    background: rgba(254, 242, 242, 0.98);
                    border-color: rgba(220, 38, 38, 0.3);
                }
                .in-app-notif-card.success {
                    border-left-color: #10b981;
                }
                .in-app-notif-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 6px;
                }
                .in-app-notif-title {
                    font-weight: 700;
                    font-size: 0.92rem;
                    color: #0f172a;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .in-app-notif-time {
                    font-size: 0.72rem;
                    color: #64748b;
                }
                .in-app-notif-body {
                    font-size: 0.82rem;
                    color: #334155;
                    line-height: 1.4;
                    margin-bottom: 8px;
                }
                .in-app-notif-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                }
                .in-app-notif-btn {
                    border: none;
                    background: rgba(27, 94, 32, 0.1);
                    color: #1B5E20;
                    font-size: 0.76rem;
                    font-weight: 600;
                    padding: 5px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .in-app-notif-btn:hover {
                    background: rgba(27, 94, 32, 0.2);
                }
                .in-app-notif-close {
                    background: none;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    font-size: 1rem;
                    padding: 0 4px;
                }
                .in-app-notif-progress {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    height: 3px;
                    background: #1B5E20;
                    width: 100%;
                    transform-origin: left;
                    animation: notifProgress 6s linear forwards;
                }
                .in-app-notif-card.sos .in-app-notif-progress {
                    background: #dc2626;
                }
                @keyframes notifProgress {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }
                @media (max-width: 576px) {
                    .in-app-notif-container {
                        top: 15px;
                        right: 15px;
                        left: 15px;
                        width: auto;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        show({ title = 'New Notification', message = '', type = 'info', icon = 'fa-solid fa-bell', duration = 6000, onClick = null }) {
            this.init();
            const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

            const card = document.createElement('div');
            card.className = `in-app-notif-card ${type === 'sos' || type === 'emergency' ? 'sos' : (type === 'success' || type === 'ride_completed' ? 'success' : '')}`;
            card.id = id;

            let iconClass = icon;
            if (type === 'sos' || type === 'emergency') iconClass = 'fa-solid fa-triangle-exclamation text-danger';
            else if (type === 'ride_completed' || type === 'success') iconClass = 'fa-solid fa-circle-check text-success';
            else if (type === 'booking' || type === 'custom_request') iconClass = 'fa-solid fa-car-side text-primary';

            card.innerHTML = `
                <div class="in-app-notif-header">
                    <div class="in-app-notif-title">
                        <i class="${iconClass}"></i>
                        <span>${title}</span>
                    </div>
                    <button class="in-app-notif-close" title="Dismiss">&times;</button>
                </div>
                <div class="in-app-notif-body">${message}</div>
                <div class="in-app-notif-actions">
                    <button class="in-app-notif-btn notif-view-btn">View Details</button>
                </div>
                <div class="in-app-notif-progress" style="animation-duration: ${duration}ms;"></div>
            `;

            this.container.appendChild(card);

            // Animate in
            setTimeout(() => card.classList.add('show'), 50);

            // Play gentle notification sound
            this.playNotificationSound();

            const closeCard = () => {
                card.classList.remove('show');
                card.classList.add('hide');
                setTimeout(() => {
                    if (card.parentNode) card.parentNode.removeChild(card);
                    this.activeToasts.delete(id);
                }, 350);
            };

            const closeBtn = card.querySelector('.in-app-notif-close');
            if (closeBtn) closeBtn.addEventListener('click', closeCard);

            const viewBtn = card.querySelector('.notif-view-btn');
            if (viewBtn) {
                viewBtn.addEventListener('click', () => {
                    closeCard();
                    if (typeof onClick === 'function') onClick();
                });
            }

            const timer = setTimeout(closeCard, duration);
            this.activeToasts.set(id, { card, timer });
        }

        playNotificationSound() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
                osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
                gain.gain.setValueAtTime(0.12, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            } catch (e) {
                // Audio context blocked or unsupported
            }
        }

        /**
         * Attaches robust live Firestore notification listeners for the active user session
         */
        startLiveListener(db, userId, role = 'passenger') {
            if (!db || !userId) return;
            const seenNotifIds = new Set();
            let isFirstLoadNotifs = true;
            let isFirstLoadBookings = true;
            let isFirstLoadReqs = true;

            // 1. Direct Notifications Collection Listener
            try {
                db.collection('notifications')
                    .where('userId', '==', userId)
                    .onSnapshot((snap) => {
                        if (isFirstLoadNotifs) {
                            snap.forEach(doc => seenNotifIds.add(doc.id));
                            isFirstLoadNotifs = false;
                            return;
                        }
                        snap.docChanges().forEach((change) => {
                            if (change.type === 'added' && !seenNotifIds.has(change.doc.id)) {
                                seenNotifIds.add(change.doc.id);
                                const notif = change.doc.data();
                                if (!notif.read) {
                                    this.show({
                                        title: notif.title || 'New Notification',
                                        message: notif.message || 'You have a new update in ICBT Ride.',
                                        type: notif.type || 'info',
                                        onClick: () => {
                                            if (role === 'passenger') {
                                                window.location.href = '/passenger-dashboard/bookings.html';
                                            } else if (role === 'driver') {
                                                window.location.href = '/driver-dashboard/driver_dashboard.html';
                                            }
                                        }
                                    });
                                }
                            }
                        });
                    }, (err) => console.warn("In-App Notification direct listener error:", err));
            } catch (e) {
                console.warn("Direct notif stream error:", e);
            }

            // 2. Real-time Driver-Specific Event Streams
            if (role === 'driver') {
                // A. Instant Live Booking Listener for Driver
                try {
                    db.collection('bookings')
                        .where('driverId', '==', userId)
                        .onSnapshot((snap) => {
                            if (isFirstLoadBookings) {
                                isFirstLoadBookings = false;
                                return;
                            }
                            snap.docChanges().forEach((change) => {
                                if (change.type === 'added') {
                                    const b = change.doc.data();
                                    if (b.status === 'Upcoming' || !b.status) {
                                        this.show({
                                            title: '🚗 New Passenger Booking!',
                                            message: `${b.passengerName || 'A passenger'} booked a seat from ${b.rideFrom || 'Origin'} to ${b.rideTo || 'Destination'} (Paid Rs. ${b.amount || 350}).`,
                                            type: 'booking',
                                            onClick: () => {
                                                window.location.href = '/driver-dashboard/driver_dashboard.html';
                                            }
                                        });
                                    }
                                }
                            });
                        }, err => console.warn("Driver bookings live stream error:", err));
                } catch (e) {}

                // B. Instant Pending Custom Request Stream for Driver
                try {
                    db.collection('RideRequests')
                        .where('status', '==', 'pending')
                        .onSnapshot((snap) => {
                            if (isFirstLoadReqs) {
                                isFirstLoadReqs = false;
                                return;
                            }
                            snap.docChanges().forEach((change) => {
                                if (change.type === 'added') {
                                    const req = change.doc.data();
                                    this.show({
                                        title: '🙋‍♂️ New Custom Ride Request!',
                                        message: `${req.passengerName || 'A student/staff'} requested a ride: ${req.origin || 'Origin'} → ${req.destination || 'Destination'} (Rs. ${req.amount || req.fare || 350}).`,
                                        type: 'custom_request',
                                        onClick: () => {
                                            window.location.href = '/driver-dashboard/driver_dashboard.html';
                                        }
                                    });
                                }
                            });
                        }, err => console.warn("Driver custom requests live stream error:", err));
                } catch (e) {}
            }

            // 3. Real-time Passenger-Specific Event Streams
            if (role === 'passenger') {
                try {
                    db.collection('RideRequests')
                        .where('passengerId', '==', userId)
                        .onSnapshot((snap) => {
                            snap.docChanges().forEach((change) => {
                                if (change.type === 'modified') {
                                    const req = change.doc.data();
                                    if (req.status === 'accepted' && req.driverName) {
                                        this.show({
                                            title: '✅ Ride Request Accepted!',
                                            message: `Driver ${req.driverName} has accepted your ride request to ${req.destination || 'Destination'}!`,
                                            type: 'success',
                                            onClick: () => {
                                                window.location.href = '/passenger-dashboard/bookings.html';
                                            }
                                        });
                                    }
                                }
                            });
                        }, err => console.warn("Passenger request status live stream error:", err));
                } catch (e) {}
            }
        }
    }

    window.InAppNotificationService = new InAppNotificationService();
})();
