import "/admin-dashboard/js/firebase-config.js";

/**
 * ==============================================================================
 * ICBT Ride - Owner Fleet & Vehicle Management System (OwnerVehicleManager)
 * ==============================================================================
 */

class OwnerVehicleManager {
    constructor() {
        this.ownerId = null;
        this.ownerData = null;
        this.vehicles = [];
        this.drivers = [];
        this.pendingApplications = [];
        this.rides = [];
        this.notifications = [];
        this.unsubscribers = [];
    }

    // Initialize Owner Manager
    async init(ownerId, ownerData) {
        this.ownerId = ownerId;
        this.ownerData = ownerData;

        // Start Real-Time Listeners
        this.listenToVehicles();
        this.listenToDrivers();
        this.listenToDriverApplications();
        this.listenToRides();
        this.listenToNotifications();
    }

    // 1. Add Vehicle to Fleet
    async addVehicle(vehicleData) {
        if (!this.ownerId) throw new Error("Owner not authenticated");
        const newVehicle = {
            ownerId: this.ownerId,
            ownerName: this.ownerData.name || this.ownerData.fullName || 'Vehicle Owner',
            plateNumber: vehicleData.plateNumber.trim().toUpperCase(),
            makeModel: vehicleData.makeModel.trim(),
            type: vehicleData.type || 'Car',
            seats: parseInt(vehicleData.seats) || 4,
            fuelType: vehicleData.fuelType || 'Petrol',
            insuranceExp: vehicleData.insuranceExp || '',
            registrationExp: vehicleData.registrationExp || '',
            status: 'Active',
            assignedDriverId: null,
            assignedDriverName: null,
            driverSharePercent: 70,
            ownerSharePercent: 30,
            totalRides: 0,
            totalEarnings: 0,
            totalPassengers: 0,
            createdAt: new Date().toISOString()
        };

        const docRef = await window.fsAddDoc(window.fsCollection(window.firebaseDb, "vehicles"), newVehicle);
        return { id: docRef.id, ...newVehicle };
    }

    // 2. Assign Driver to Vehicle with Commission Split
    async assignDriverToVehicle(driverId, vehicleId, assignmentData = {}) {
        const driverShare = parseInt(assignmentData.driverShare) || 70;
        const ownerShare = 100 - driverShare;

        // Fetch driver info
        const driverDoc = await window.fsGetDoc(window.fsDoc(window.firebaseDb, "users", driverId));
        if (!driverDoc.exists()) throw new Error("Driver not found");
        const driver = driverDoc.data();
        const driverName = driver.name || driver.fullName || 'Driver';

        // Fetch vehicle info
        const vehicleDoc = await window.fsGetDoc(window.fsDoc(window.firebaseDb, "vehicles", vehicleId));
        if (!vehicleDoc.exists()) throw new Error("Vehicle not found");
        const vehicle = vehicleDoc.data();

        // 1. Update Vehicle Document
        await window.fsUpdateDoc(window.fsDoc(window.firebaseDb, "vehicles", vehicleId), {
            assignedDriverId: driverId,
            assignedDriverName: driverName,
            driverSharePercent: driverShare,
            ownerSharePercent: ownerShare,
            status: 'Active'
        });

        // 2. Update Driver User Document
        await window.fsUpdateDoc(window.fsDoc(window.firebaseDb, "users", driverId), {
            ownerId: this.ownerId,
            ownerName: this.ownerData.name || this.ownerData.fullName || 'Owner',
            assignedVehicleId: vehicleId,
            vehiclePlate: vehicle.plateNumber,
            vehicleModel: vehicle.makeModel,
            availableSeats: vehicle.seats || 4,
            ownerApprovalStatus: 'approved',
            driverSharePercent: driverShare,
            ownerSharePercent: ownerShare
        });

        // 3. Send Notification to Driver
        await window.fsAddDoc(window.fsCollection(window.firebaseDb, "notifications"), {
            userId: driverId,
            title: "Vehicle Assigned! 🚗",
            message: `You have been assigned to ${vehicle.makeModel} (${vehicle.plateNumber}) with a ${driverShare}% revenue share.`,
            type: "vehicle_assigned",
            vehicleId: vehicleId,
            read: false,
            timestamp: new Date().toISOString()
        });
    }

    // 3. Remove Driver Assignment
    async removeDriverAssignment(vehicleId, driverId) {
        if (vehicleId) {
            await window.fsUpdateDoc(window.fsDoc(window.firebaseDb, "vehicles", vehicleId), {
                assignedDriverId: null,
                assignedDriverName: null
            });
        }

        if (driverId) {
            await window.fsUpdateDoc(window.fsDoc(window.firebaseDb, "users", driverId), {
                assignedVehicleId: null,
                vehiclePlate: '',
                vehicleModel: ''
            });

            // Notify Driver
            await window.fsAddDoc(window.fsCollection(window.firebaseDb, "notifications"), {
                userId: driverId,
                title: "Vehicle Assignment Removed",
                message: `Your assignment to the fleet vehicle has been removed by the owner.`,
                type: "assignment_removed",
                read: false,
                timestamp: new Date().toISOString()
            });
        }
    }

    // 4. Accept Driver Application & Assign Vehicle
    async acceptDriverApplication(driverId, vehicleId, driverShare = 70) {
        await this.assignDriverToVehicle(driverId, vehicleId, { driverShare });
    }

    // 5. Reject Driver Application
    async rejectDriverApplication(driverId) {
        await window.fsUpdateDoc(window.fsDoc(window.firebaseDb, "users", driverId), {
            ownerApprovalStatus: 'rejected',
            ownerId: null,
            ownerName: null
        });

        await window.fsAddDoc(window.fsCollection(window.firebaseDb, "notifications"), {
            userId: driverId,
            title: "Application Status Update",
            message: "Your application to join the owner fleet was not accepted at this time.",
            type: "application_rejected",
            read: false,
            timestamp: new Date().toISOString()
        });
    }

    // 6. Delete Vehicle
    async deleteVehicle(vehicleId) {
        const vehicle = this.vehicles.find(v => v.id === vehicleId);
        if (vehicle && vehicle.assignedDriverId) {
            await this.removeDriverAssignment(vehicleId, vehicle.assignedDriverId);
        }
        await window.fsDeleteDoc(window.fsDoc(window.firebaseDb, "vehicles", vehicleId));
    }

    // ---------------------------------------------------------
    // REAL-TIME LISTENERS (Firestore onSnapshot)
    // ---------------------------------------------------------

    // Listen to Vehicles owned by this Owner
    listenToVehicles() {
        const q = window.fsQuery(window.fsCollection(window.firebaseDb, "vehicles"));
        const unsub = window.fsOnSnapshot(q, (snapshot) => {
            this.vehicles = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.ownerId === this.ownerId) {
                    this.vehicles.push({ id: doc.id, ...data });
                }
            });
            this.renderCurrentPage();
        }, (err) => console.error("Error listening to vehicles:", err));
        this.unsubscribers.push(unsub);
    }

    // Listen to Hired / Fleet Drivers
    listenToDrivers() {
        const q = window.fsQuery(window.fsCollection(window.firebaseDb, "users"));
        const unsub = window.fsOnSnapshot(q, (snapshot) => {
            this.drivers = [];
            this.pendingApplications = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.role === 'driver') {
                    if (data.ownerId === this.ownerId) {
                        if (data.ownerApprovalStatus === 'pending') {
                            this.pendingApplications.push({ id: doc.id, ...data });
                        } else if (data.ownerApprovalStatus === 'approved') {
                            this.drivers.push({ id: doc.id, ...data });
                        }
                    }
                }
            });
            this.renderCurrentPage();
        }, (err) => console.error("Error listening to drivers:", err));
        this.unsubscribers.push(unsub);
    }

    // Listen to Driver Applications & Notifications
    listenToDriverApplications() {
        // Handled in listenToDrivers via ownerApprovalStatus == 'pending'
    }

    listenToNotifications() {
        const q = window.fsQuery(
            window.fsCollection(window.firebaseDb, "notifications"),
            window.fsWhere("userId", "==", this.ownerId)
        );
        const unsub = window.fsOnSnapshot(q, (snapshot) => {
            this.notifications = [];
            let unread = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                this.notifications.push({ id: doc.id, ...data });
                if (!data.read) unread++;
            });
            this.notifications.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

            // Update badge & notification dropdown
            const badge = document.getElementById('ownerNotifBadge');
            const list = document.getElementById('ownerNotifList');
            if (badge) {
                if (unread > 0) {
                    badge.innerText = unread;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
            if (list) {
                if (this.notifications.length === 0) {
                    list.innerHTML = '<p style="padding: 15px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No notifications</p>';
                } else {
                    list.innerHTML = this.notifications.map(n => `
                        <div style="padding: 12px 15px; border-bottom: 1px solid var(--border-color); background: ${n.read ? 'transparent' : 'rgba(27,94,32,0.04)'};">
                            <div style="font-weight: 600; font-size: 0.9rem; color: var(--primary-color);">${n.title || 'Notification'}</div>
                            <div style="font-size: 0.8rem; color: var(--text-main); margin-top: 3px;">${n.message || ''}</div>
                        </div>
                    `).join('');
                }
            }
        }, (err) => console.error("Error listening to notifications:", err));
        this.unsubscribers.push(unsub);
    }

    // Listen to Fleet Rides
    listenToRides() {
        const q = window.fsQuery(
            window.fsCollection(window.firebaseDb, "rides"),
            window.fsOrderBy("createdAt", "desc")
        );
        const unsub = window.fsOnSnapshot(q, (snapshot) => {
            this.rides = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Match rides that belong to this owner's vehicles or drivers
                const isOwnerRide = data.ownerId === this.ownerId || 
                    this.vehicles.some(v => v.id === data.vehicleId || (v.plateNumber && v.plateNumber === data.plateNumber)) ||
                    this.drivers.some(d => d.id === data.driverId);

                if (isOwnerRide) {
                    this.rides.push({ id: doc.id, ...data });
                }
            });
            this.renderCurrentPage();
        }, (err) => {
            // Fallback without ordering if index not built
            const fallbackQ = window.fsQuery(window.fsCollection(window.firebaseDb, "rides"));
            window.fsOnSnapshot(fallbackQ, (snapshot) => {
                this.rides = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const isOwnerRide = data.ownerId === this.ownerId || 
                        this.vehicles.some(v => v.id === data.vehicleId || (v.plateNumber && v.plateNumber === data.plateNumber)) ||
                        this.drivers.some(d => d.id === data.driverId);

                    if (isOwnerRide) {
                        this.rides.push({ id: doc.id, ...data });
                    }
                });
                this.renderCurrentPage();
            });
        });
        this.unsubscribers.push(unsub);
    }

    // Render Logic across all owner pages
    renderCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('owner_dashboard.html')) {
            this.renderDashboard();
        } else if (path.includes('vehicles.html')) {
            this.renderVehiclesPage();
        } else if (path.includes('drivers.html')) {
            this.renderDriversPage();
        } else if (path.includes('rides.html')) {
            this.renderRidesPage();
        }
    }

    // ---------------------------------------------------------
    // PAGE RENDERERS
    // ---------------------------------------------------------

    // 1. Dashboard Renderer
    renderDashboard() {
        let totalVehicles = this.vehicles.length;
        let activeVehicles = this.vehicles.filter(v => v.status === 'Active' || v.status === 'On Ride').length;
        let assignedDrivers = this.drivers.length;
        let pendingDrivers = this.pendingApplications.length;
        let totalFleetRides = this.rides.length;
        let totalPassengers = 0;
        let totalOwnerEarnings = 0;
        let totalGrossRevenue = 0;

        // Calculate statistics
        this.rides.forEach(r => {
            const fare = Number(r.price || r.totalFare || 350) * Number(r.bookedSeats || 1);
            totalGrossRevenue += fare;
            if (r.ownerEarnings) {
                totalOwnerEarnings += Number(r.ownerEarnings);
            } else if (r.ownerId === this.ownerId) {
                const ownerShare = Number(r.ownerSharePercent || 30);
                totalOwnerEarnings += (fare * ownerShare / 100);
            }
            totalPassengers += Number(r.bookedSeats || 1);
        });

        // Update Dashboard Stats Elements
        const elTotalV = document.getElementById('statTotalVehicles');
        const elActiveV = document.getElementById('statActiveVehicles');
        const elAssignedD = document.getElementById('statAssignedDrivers');
        const elPendingD = document.getElementById('statPendingDrivers');
        const elTotalR = document.getElementById('statTotalRides');
        const elTotalP = document.getElementById('statTotalPassengers');
        const elOwnerEarn = document.getElementById('statOwnerEarnings');
        const elGross = document.getElementById('statGrossRevenue');

        if (elTotalV) elTotalV.innerText = totalVehicles;
        if (elActiveV) elActiveV.innerText = `${activeVehicles} Active on Fleet`;
        if (elAssignedD) elAssignedD.innerText = assignedDrivers;
        if (elPendingD) elPendingD.innerText = `${pendingDrivers} pending application${pendingDrivers === 1 ? '' : 's'}`;
        if (elTotalR) elTotalR.innerText = totalFleetRides;
        if (elTotalP) elTotalP.innerText = `${totalPassengers} passenger${totalPassengers === 1 ? '' : 's'} served`;
        if (elOwnerEarn) elOwnerEarn.innerText = totalOwnerEarnings.toLocaleString();
        if (elGross) elGross.innerText = `Rs. ${totalGrossRevenue.toLocaleString()} Fleet Gross`;

        // Render Pending Applications Card
        const pendingContainer = document.getElementById('pendingDriversContainer');
        if (pendingContainer) {
            if (this.pendingApplications.length === 0) {
                pendingContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 25px 10px; font-size: 0.9rem;"><i class="fa-solid fa-circle-check text-success me-1"></i> No pending driver applications right now.</p>';
            } else {
                pendingContainer.innerHTML = this.pendingApplications.map(d => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: rgba(255,193,7,0.06); border: 1px solid rgba(255,193,7,0.3); border-radius: 12px; margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="avatar" style="width: 38px; height: 38px; font-size: 1rem;">${(d.name || 'D').charAt(0).toUpperCase()}</div>
                            <div>
                                <div style="font-weight: 600; font-size: 0.95rem;">${d.name || d.fullName}</div>
                                <div style="font-size: 0.8rem; color: var(--text-muted);">${d.phone || ''} | NIC: ${d.nic || 'N/A'}</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn" style="background: var(--primary-color); color: white; padding: 6px 12px; font-size: 0.8rem; border-radius: 8px;" onclick="window.ownerManager.openAssignModalForApplicant('${d.id}')">
                                <i class="fa-solid fa-check"></i> Assign Vehicle
                            </button>
                            <button class="btn" style="background: rgba(239,68,68,0.1); color: var(--danger-color); padding: 6px 10px; font-size: 0.8rem; border-radius: 8px;" onclick="window.ownerManager.handleRejectDriver('${d.id}')">
                                <i class="fa-solid fa-xmark"></i> Decline
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        }

        // Calculate Top Vehicle & Top Driver
        let topVehicle = this.vehicles[0];
        let topDriver = this.drivers[0];

        if (this.vehicles.length > 0) {
            topVehicle = [...this.vehicles].sort((a, b) => (b.totalEarnings || 0) - (a.totalEarnings || 0))[0];
            const tvPlate = document.getElementById('topVehiclePlate');
            const tvModel = document.getElementById('topVehicleModel');
            const tvEarnings = document.getElementById('topVehicleEarnings');
            const tvRides = document.getElementById('topVehicleRides');
            if (tvPlate) tvPlate.innerText = topVehicle.plateNumber || 'Fleet Vehicle';
            if (tvModel) tvModel.innerText = topVehicle.makeModel || 'Car';
            if (tvEarnings) tvEarnings.innerText = `Rs. ${(topVehicle.totalEarnings || 0).toLocaleString()}`;
            if (tvRides) tvRides.innerText = `${topVehicle.totalRides || 0} rides completed`;
        }

        if (this.drivers.length > 0) {
            topDriver = [...this.drivers].sort((a, b) => (b.totalEarnings || 0) - (a.totalEarnings || 0))[0];
            const tdName = document.getElementById('topDriverName');
            const tdPhone = document.getElementById('topDriverPhone');
            const tdEarnings = document.getElementById('topDriverEarnings');
            const tdRides = document.getElementById('topDriverRides');
            if (tdName) tdName.innerText = topDriver.name || topDriver.fullName || 'Fleet Driver';
            if (tdPhone) tdPhone.innerText = topDriver.phone || 'Active Member';
            if (tdEarnings) tdEarnings.innerText = `Rs. ${(topDriver.totalEarnings || 0).toLocaleString()}`;
            if (tdRides) tdRides.innerText = `${topDriver.totalRides || 0} rides completed`;
        }

        // Render Recent Fleet Rides
        const recentRidesContainer = document.getElementById('recentFleetRidesContainer');
        if (recentRidesContainer) {
            if (this.rides.length === 0) {
                recentRidesContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 25px; font-size: 0.9rem;">No fleet rides completed yet.</p>';
            } else {
                recentRidesContainer.innerHTML = this.rides.slice(0, 5).map(r => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-radius: 10px; margin-bottom: 8px; background: rgba(0,0,0,0.02); border: 1px solid var(--border-color); font-size: 0.88rem;">
                        <div>
                            <strong>${r.start || r.origin} → ${r.dest || r.destination}</strong>
                            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                                Driver: <b>${r.driverName || 'Driver'}</b> &nbsp;|&nbsp; Vehicle: <b>${r.plateNumber || r.vehicle || 'Fleet'}</b> &nbsp;|&nbsp; ${r.date || ''}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 700; color: var(--primary-color);">Rs. ${Number(r.price || 350).toLocaleString()}</div>
                            <span class="badge" style="background: rgba(16,185,129,0.15); color: var(--success-color); font-size: 0.72rem;">${r.status || 'Completed'}</span>
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    // 2. Vehicles Page Renderer
    renderVehiclesPage() {
        const container = document.getElementById('vehiclesContainer');
        const countDisplay = document.getElementById('vehicleCountDisplay');
        if (countDisplay) countDisplay.innerText = this.vehicles.length;

        if (!container) return;

        if (this.vehicles.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px; font-size: 1rem;">No vehicles registered yet. Click "Add New Vehicle" to add your first car to the fleet.</p>';
            return;
        }

        container.innerHTML = this.vehicles.map(v => {
            const hasDriver = !!v.assignedDriverId;
            return `
            <div class="vehicle-card" style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
                <div class="vehicle-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
                    <div>
                        <h3 style="margin: 0; color: var(--primary-color); font-size: 1.25rem;">${v.plateNumber}</h3>
                        <p style="margin: 3px 0 0 0; color: var(--text-muted); font-size: 0.9rem;">${v.makeModel} (${v.type || 'Car'})</p>
                    </div>
                    <span class="badge" style="background: ${v.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)'}; color: ${v.status === 'Active' ? 'var(--success-color)' : 'var(--danger-color)'}; font-weight: 600;">
                        ${v.status || 'Active'}
                    </span>
                </div>
                <div class="vehicle-details" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.85rem; margin-bottom: 16px;">
                    <div>
                        <label style="color: var(--text-muted); display: block;">Seats & Fuel</label>
                        <span><b>${v.seats || 4} Seats</b> (${v.fuelType || 'Petrol'})</span>
                    </div>
                    <div>
                        <label style="color: var(--text-muted); display: block;">Assigned Driver</label>
                        <span>${hasDriver ? `<b style="color: var(--primary-color);"><i class="fa-solid fa-user-check me-1"></i>${v.assignedDriverName}</b>` : '<span style="color: var(--danger-color);">Unassigned</span>'}</span>
                    </div>
                    <div>
                        <label style="color: var(--text-muted); display: block;">Total Rides Done</label>
                        <span><b>${v.totalRides || 0} Rides</b></span>
                    </div>
                    <div>
                        <label style="color: var(--text-muted); display: block;">Fleet Earnings</label>
                        <span style="color: var(--primary-color); font-weight: 700;">Rs. ${(v.totalEarnings || 0).toLocaleString()}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid var(--border-color); padding-top: 12px;">
                    ${hasDriver ? `
                        <button class="btn" style="background: rgba(239,68,68,0.1); color: var(--danger-color); padding: 6px 12px; font-size: 0.8rem; border-radius: 8px;" onclick="window.ownerManager.handleUnassign('${v.id}', '${v.assignedDriverId}')">
                            <i class="fa-solid fa-user-minus"></i> Unassign
                        </button>
                    ` : `
                        <button class="btn" style="background: var(--primary-color); color: white; padding: 6px 12px; font-size: 0.8rem; border-radius: 8px;" onclick="window.ownerManager.openQuickAssign('${v.id}', '${v.plateNumber}', '${v.makeModel}')">
                            <i class="fa-solid fa-user-plus"></i> Assign Driver
                        </button>
                    `}
                    <button class="btn" style="background: rgba(239,68,68,0.08); color: var(--danger-color); padding: 6px 10px; font-size: 0.8rem; border-radius: 8px;" onclick="window.ownerManager.handleDeleteVehicle('${v.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            `;
        }).join('');
    }

    // 3. Drivers Page Renderer
    renderDriversPage() {
        const pendingTbody = document.getElementById('pendingDriversTbody');
        const assignedTbody = document.getElementById('assignedDriversTbody');
        const pendingCount = document.getElementById('pendingCount');
        const assignedCount = document.getElementById('assignedCount');

        if (pendingCount) pendingCount.innerText = this.pendingApplications.length;
        if (assignedCount) assignedCount.innerText = this.drivers.length;

        // Populate Pending Applications
        if (pendingTbody) {
            if (this.pendingApplications.length === 0) {
                pendingTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 25px; color: var(--text-muted);"><i class="fa-solid fa-circle-check text-success me-1"></i> No pending applications.</td></tr>';
            } else {
                pendingTbody.innerHTML = this.pendingApplications.map(d => `
                    <tr>
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="avatar" style="width: 36px; height: 36px; font-size: 0.95rem;">${(d.name || 'D').charAt(0).toUpperCase()}</div>
                                <div>
                                    <div style="font-weight: 600;">${d.name || d.fullName}</div>
                                    <div style="font-size: 0.78rem; color: var(--text-muted);">${d.email || ''}</div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <div>${d.phone || 'N/A'}</div>
                            <div style="font-size: 0.78rem; color: var(--text-muted);">NIC: ${d.nic || 'N/A'}</div>
                        </td>
                        <td>${d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Recent'}</td>
                        <td><span class="badge" style="background: rgba(255,193,7,0.2); color: #b45309;">Pending Approval</span></td>
                        <td>
                            <button class="btn" style="background: var(--primary-color); color: white; padding: 5px 12px; font-size: 0.8rem; border-radius: 6px;" onclick="window.ownerManager.openAssignModalForApplicant('${d.id}')">
                                <i class="fa-solid fa-check me-1"></i> Accept & Assign
                            </button>
                            <button class="btn" style="background: rgba(239,68,68,0.1); color: var(--danger-color); padding: 5px 10px; font-size: 0.8rem; border-radius: 6px; margin-left: 4px;" onclick="window.ownerManager.handleRejectDriver('${d.id}')">
                                <i class="fa-solid fa-xmark"></i> Decline
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }

        // Populate Assigned Fleet Drivers
        if (assignedTbody) {
            if (this.drivers.length === 0) {
                assignedTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 25px; color: var(--text-muted);">No drivers currently assigned to your vehicles.</td></tr>';
            } else {
                assignedTbody.innerHTML = this.drivers.map(d => {
                    const assignedV = this.vehicles.find(v => v.id === d.assignedVehicleId) || { plateNumber: d.vehiclePlate || 'Assigned', makeModel: d.vehicleModel || 'Vehicle' };
                    return `
                    <tr>
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="avatar" style="width: 36px; height: 36px; font-size: 0.95rem;">${(d.name || 'D').charAt(0).toUpperCase()}</div>
                                <div>
                                    <div style="font-weight: 600;">${d.name || d.fullName}</div>
                                    <div style="font-size: 0.78rem; color: var(--text-muted);">${d.phone || d.email}</div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <strong>${assignedV.plateNumber}</strong>
                            <div style="font-size: 0.78rem; color: var(--text-muted);">${assignedV.makeModel}</div>
                        </td>
                        <td>
                            <span class="badge" style="background: rgba(27,94,32,0.1); color: var(--primary-color); font-weight: 600;">
                                ${d.driverSharePercent || 70}% Driver / ${d.ownerSharePercent || 30}% Owner
                            </span>
                        </td>
                        <td>
                            <div><b>${d.totalRides || 0}</b> Rides</div>
                            <div style="font-size: 0.78rem; color: var(--success-color); font-weight: 600;">Rs. ${(d.totalEarnings || 0).toLocaleString()}</div>
                        </td>
                        <td>
                            <button class="btn" style="background: rgba(239,68,68,0.1); color: var(--danger-color); padding: 5px 12px; font-size: 0.8rem; border-radius: 6px;" onclick="window.ownerManager.handleUnassign('${d.assignedVehicleId}', '${d.id}')">
                                <i class="fa-solid fa-user-minus me-1"></i> Unassign
                            </button>
                        </td>
                    </tr>
                    `;
                }).join('');
            }
        }
    }

    // 4. Rides Page Renderer
    renderRidesPage() {
        const tbody = document.getElementById('ownerRidesTbody');
        const countDisplay = document.getElementById('fleetRidesCount');
        if (countDisplay) countDisplay.innerText = `${this.rides.length} rides recorded`;

        if (!tbody) return;

        if (this.rides.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">No fleet rides found.</td></tr>';
            return;
        }

        tbody.innerHTML = this.rides.map(r => {
            const totalFare = Number(r.price || 350) * Number(r.bookedSeats || 1);
            const driverPayout = r.driverEarnings ? Number(r.driverEarnings) : (totalFare * Number(r.driverSharePercent || 70) / 100);
            const ownerRevenue = r.ownerEarnings ? Number(r.ownerEarnings) : (totalFare * Number(r.ownerSharePercent || 30) / 100);
            const dateStr = r.date || (r.createdAt ? new Date(r.createdAt.toDate ? r.createdAt.toDate() : r.createdAt).toLocaleDateString() : 'N/A');

            return `
            <tr>
                <td><b>#${r.id.substring(0, 5).toUpperCase()}</b></td>
                <td>
                    <div>${dateStr}</div>
                    <div style="font-size: 0.78rem; color: var(--text-muted);">${r.time || ''}</div>
                </td>
                <td>
                    <strong>${r.driverName || 'Driver'}</strong>
                    <div style="font-size: 0.78rem; color: var(--text-muted);">${r.plateNumber || r.vehicle || 'Vehicle'}</div>
                </td>
                <td>
                    <div>${r.start || r.origin} → ${r.dest || r.destination}</div>
                </td>
                <td><strong style="color: var(--text-main);">Rs. ${totalFare.toLocaleString()}</strong></td>
                <td><span style="color: var(--success-color); font-weight: 600;">Rs. ${driverPayout.toLocaleString()}</span></td>
                <td><span style="color: var(--primary-color); font-weight: 700;">Rs. ${ownerRevenue.toLocaleString()}</span></td>
                <td>
                    <span class="badge" style="background: ${r.status === 'completed' ? 'rgba(16,185,129,0.15)' : (r.status === 'active' ? 'rgba(27,94,32,0.12)' : 'rgba(239,68,68,0.12)')}; color: ${r.status === 'completed' ? 'var(--success-color)' : (r.status === 'active' ? 'var(--primary-color)' : 'var(--danger-color)')};">
                        ${r.status || 'Completed'}
                    </span>
                </td>
            </tr>
            `;
        }).join('');
    }

    // Modal Helpers
    openAssignModalForApplicant(driverId) {
        const modal = document.getElementById('assignDriverModal');
        const driverSelect = document.getElementById('d-driver');
        const vehicleSelect = document.getElementById('d-vehicle');

        if (!modal) return;

        // Populate available vehicles
        let vOptions = '<option value="">-- Select a Vehicle --</option>';
        this.vehicles.forEach(v => {
            vOptions += `<option value="${v.id}">${v.plateNumber} (${v.makeModel} - ${v.seats} seats) ${v.assignedDriverId ? '[Currently Assigned]' : '[Available]'}</option>`;
        });
        if (vehicleSelect) vehicleSelect.innerHTML = vOptions;

        // Populate drivers
        const applicant = this.pendingApplications.find(d => d.id === driverId);
        if (driverSelect && applicant) {
            driverSelect.innerHTML = `<option value="${applicant.id}" selected>${applicant.name || applicant.fullName} (${applicant.phone})</option>`;
        }

        modal.classList.add('active');
    }

    openQuickAssign(vehicleId, plate, model) {
        const modal = document.getElementById('quickAssignModal');
        if (!modal) return;

        document.getElementById('qa-vehicle-id').value = vehicleId;
        document.getElementById('qa-vehicle-name').innerText = model;
        document.getElementById('qa-vehicle-plate').innerText = plate;

        // Populate drivers (pending applicants + unassigned drivers)
        const driverSelect = document.getElementById('qa-driver-select');
        let dOptions = '<option value="">-- Choose a Driver --</option>';
        this.pendingApplications.forEach(d => {
            dOptions += `<option value="${d.id}">[Applicant] ${d.name || d.fullName} (${d.phone})</option>`;
        });
        this.drivers.forEach(d => {
            dOptions += `<option value="${d.id}">[Fleet] ${d.name || d.fullName} (${d.phone})</option>`;
        });
        if (driverSelect) driverSelect.innerHTML = dOptions;

        modal.classList.add('active');
    }

    async handleUnassign(vehicleId, driverId) {
        if (!confirm("Are you sure you want to remove this driver's vehicle assignment?")) return;
        try {
            await this.removeDriverAssignment(vehicleId, driverId);
            alert("Driver assignment removed.");
        } catch (err) {
            console.error("Error unassigning:", err);
            alert("Failed to unassign driver.");
        }
    }

    async handleRejectDriver(driverId) {
        if (!confirm("Decline this driver application?")) return;
        try {
            await this.rejectDriverApplication(driverId);
            alert("Application declined.");
        } catch (err) {
            console.error("Error rejecting:", err);
            alert("Failed to decline application.");
        }
    }

    async handleDeleteVehicle(vehicleId) {
        if (!confirm("Are you sure you want to remove this vehicle from your fleet?")) return;
        try {
            await this.deleteVehicle(vehicleId);
            alert("Vehicle removed from fleet.");
        } catch (err) {
            console.error("Error deleting vehicle:", err);
            alert("Failed to delete vehicle.");
        }
    }
}

// ---------------------------------------------------------
// DOM Ready & Event Listeners
// ---------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const userId = localStorage.getItem('loggedInUserId');
    const userRole = localStorage.getItem('loggedInUserRole');

    if (!userId || userRole !== 'owner') {
        alert("You must be logged in as a Vehicle Owner to view this page.");
        window.location.href = '/main-login/login.html';
        return;
    }

    // Logout handling
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileLogoutBtn = document.querySelector('.mobile-logout-btn');
    const handleLogout = (e) => {
        e.preventDefault();
        if (confirm("Log out of owner dashboard?")) {
            localStorage.removeItem('loggedInUserId');
            localStorage.removeItem('loggedInUserRole');
            localStorage.removeItem('loggedInUser');
            window.location.href = '/main-login/login.html';
        }
    };
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);

    // Notifications dropdown toggle
    const bell = document.getElementById('ownerNotifBell');
    const dropdown = document.getElementById('ownerNotifDropdown');
    if (bell && dropdown) {
        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });
        document.addEventListener('click', () => { dropdown.style.display = 'none'; });
    }

    // Fetch Owner User Document
    const ownerDoc = await window.fsGetDoc(window.fsDoc(window.firebaseDb, "users", userId));
    if (!ownerDoc.exists()) {
        alert("Owner profile not found.");
        window.location.href = '/main-login/login.html';
        return;
    }
    const ownerData = ownerDoc.data();

    // Update Header UI
    const nameEl = document.getElementById('ownerNameDisplay');
    const emailEl = document.getElementById('ownerEmailDisplay');
    const avatarEl = document.getElementById('ownerAvatarDisplay');
    if (nameEl) nameEl.innerText = ownerData.name || ownerData.fullName || 'Vehicle Owner';
    if (emailEl) emailEl.innerText = ownerData.email || 'owner@icbtride.com';
    if (avatarEl) avatarEl.innerText = (ownerData.name || 'O').charAt(0).toUpperCase();

    // Instantiate Owner Manager
    window.ownerManager = new OwnerVehicleManager();
    await window.ownerManager.init(userId, ownerData);

    // --- Add Vehicle Form & Modal (vehicles.html) ---
    const openAddVehicleBtn = document.getElementById('openAddVehicleBtn');
    const addVehicleModal = document.getElementById('addVehicleModal');
    const addVehicleForm = document.getElementById('addVehicleForm');
    const closeModals = document.querySelectorAll('.close-modal');

    if (openAddVehicleBtn && addVehicleModal) {
        openAddVehicleBtn.addEventListener('click', () => addVehicleModal.classList.add('active'));
    }

    closeModals.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.custom-modal').forEach(m => m.classList.remove('active'));
        });
    });

    if (addVehicleForm) {
        addVehicleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('addVehicleBtn');
            const orig = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            btn.disabled = true;

            try {
                await window.ownerManager.addVehicle({
                    plateNumber: document.getElementById('v-plate').value,
                    makeModel: document.getElementById('v-model').value,
                    type: document.getElementById('v-type').value,
                    seats: document.getElementById('v-seats').value,
                    fuelType: document.getElementById('v-fuel').value,
                    insuranceExp: document.getElementById('v-insurance').value,
                    registrationExp: document.getElementById('v-reg-date').value
                });
                alert("Vehicle registered to fleet successfully! 🎉");
                addVehicleModal.classList.remove('active');
                addVehicleForm.reset();
            } catch (err) {
                console.error("Error adding vehicle:", err);
                alert("Failed to add vehicle: " + err.message);
            } finally {
                btn.innerHTML = orig;
                btn.disabled = false;
            }
        });
    }

    // --- Quick Assign Form (vehicles.html) ---
    const quickAssignForm = document.getElementById('quickAssignForm');
    if (quickAssignForm) {
        const dShareInput = document.getElementById('qa-driver-share');
        const oShareInput = document.getElementById('qa-owner-share');
        if (dShareInput && oShareInput) {
            dShareInput.addEventListener('input', () => {
                const val = Math.min(100, Math.max(0, parseInt(dShareInput.value) || 0));
                oShareInput.value = 100 - val;
            });
        }

        quickAssignForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const vId = document.getElementById('qa-vehicle-id').value;
            const dId = document.getElementById('qa-driver-select').value;
            const dShare = parseInt(dShareInput.value) || 70;

            if (!vId || !dId) {
                alert("Please select a driver.");
                return;
            }

            try {
                await window.ownerManager.assignDriverToVehicle(dId, vId, { driverShare: dShare });
                alert("Driver assigned successfully! 🎉");
                document.getElementById('quickAssignModal').classList.remove('active');
            } catch (err) {
                console.error("Error assigning driver:", err);
                alert("Assignment failed: " + err.message);
            }
        });
    }

    // --- Assign Driver Modal & Form (drivers.html) ---
    const openAssignModalBtn = document.getElementById('openAssignModalBtn');
    const assignDriverModal = document.getElementById('assignDriverModal');
    const assignDriverForm = document.getElementById('assignDriverForm');

    if (openAssignModalBtn && assignDriverModal) {
        openAssignModalBtn.addEventListener('click', () => {
            // Populate vehicles and drivers
            const vSelect = document.getElementById('d-vehicle');
            const dSelect = document.getElementById('d-driver');
            if (vSelect) {
                vSelect.innerHTML = '<option value="">-- Choose a Vehicle --</option>' +
                    window.ownerManager.vehicles.map(v => `<option value="${v.id}">${v.plateNumber} (${v.makeModel})</option>`).join('');
            }
            if (dSelect) {
                dSelect.innerHTML = '<option value="">-- Choose a Driver --</option>' +
                    [...window.ownerManager.pendingApplications, ...window.ownerManager.drivers].map(d => `<option value="${d.id}">${d.name || d.fullName} (${d.phone})</option>`).join('');
            }
            assignDriverModal.classList.add('active');
        });
    }

    if (assignDriverForm) {
        const dShare = document.getElementById('d-driver-share');
        const oShare = document.getElementById('d-owner-share');
        if (dShare && oShare) {
            dShare.addEventListener('input', () => {
                const val = Math.min(100, Math.max(0, parseInt(dShare.value) || 0));
                oShare.value = 100 - val;
            });
        }

        assignDriverForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const dId = document.getElementById('d-driver').value;
            const vId = document.getElementById('d-vehicle').value;
            const share = parseInt(dShare.value) || 70;

            if (!dId || !vId) {
                alert("Please select both a driver and a vehicle.");
                return;
            }

            try {
                await window.ownerManager.assignDriverToVehicle(dId, vId, { driverShare: share });
                alert("Driver assigned successfully! 🎉");
                assignDriverModal.classList.remove('active');
            } catch (err) {
                console.error("Error assigning driver:", err);
                alert("Failed to assign driver: " + err.message);
            }
        });
    }

    // --- Profile Page (profile.html) ---
    const ownerProfileForm = document.getElementById('ownerProfileForm');
    if (ownerProfileForm) {
        const pName = document.getElementById('ownerProfileName');
        const pNic = document.getElementById('ownerProfileNic');
        const pPhone = document.getElementById('ownerProfilePhone');
        const pEmail = document.getElementById('ownerProfileEmail');
        const pAddress = document.getElementById('ownerProfileAddress');

        if (pName) pName.value = ownerData.name || ownerData.fullName || '';
        if (pNic) pNic.value = ownerData.nic || '';
        if (pPhone) pPhone.value = ownerData.phone || '';
        if (pEmail) pEmail.value = ownerData.email || '';
        if (pAddress) pAddress.value = ownerData.address || '';

        ownerProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveBtn = document.getElementById('saveOwnerProfileBtn');
            const orig = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            saveBtn.disabled = true;

            try {
                await window.fsUpdateDoc(window.fsDoc(window.firebaseDb, "users", userId), {
                    name: pName.value.trim(),
                    fullName: pName.value.trim(),
                    nic: pNic.value.trim(),
                    phone: pPhone.value.trim(),
                    address: pAddress.value.trim(),
                    updatedAt: new Date().toISOString()
                });
                alert("Profile details updated successfully! 🎉");
            } catch (err) {
                console.error("Error saving owner profile:", err);
                alert("Failed to save profile.");
            } finally {
                saveBtn.innerHTML = orig;
                saveBtn.disabled = false;
            }
        });
    }
});

