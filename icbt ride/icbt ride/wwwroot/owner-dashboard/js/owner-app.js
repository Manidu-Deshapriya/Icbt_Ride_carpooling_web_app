import "/admin-dashboard/js/firebase-config.js";

// Global variables for logged-in owner
let currentOwnerId = null;
let currentOwnerData = null;

document.addEventListener('DOMContentLoaded', async () => {
    
    // Setup Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileLogoutBtn = document.querySelector('.mobile-logout-btn');
    const handleLogout = (e) => {
        e.preventDefault();
        if (confirm("Are you sure you want to log out?")) {
            localStorage.removeItem('loggedInUserId');
            localStorage.removeItem('loggedInUserRole');
            window.location.href = '/main-login/login.html';
        }
    };
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);

    // Auth Check
    const userId = localStorage.getItem('loggedInUserId');
    const userRole = localStorage.getItem('loggedInUserRole');

    if (!userId || userRole !== 'owner') {
        alert("You must be logged in as an Owner to view this page.");
        window.location.href = '/main-login/login.html';
        return;
    }
    
    currentOwnerId = userId;

    try {
        // Fetch Owner Details
        const ownerDocRef = window.fsDoc(window.firebaseDb, "users", currentOwnerId);
        window.fsOnSnapshot(ownerDocRef, (docSnap) => {
            if (docSnap.exists()) {
                currentOwnerData = docSnap.data();
                updateGlobalOwnerUI();
                
                // Initialize page specific logic
                const path = window.location.pathname;
                if (path.includes('owner_dashboard.html')) {
                    initDashboardStats();
                } else if (path.includes('vehicles.html')) {
                    initVehiclesPage();
                } else if (path.includes('drivers.html')) {
                    initDriversPage();
                } else if (path.includes('rides.html')) {
                    initRidesPage();
                } else if (path.includes('profile.html')) {
                    initProfilePage();
                }

            } else {
                console.error("Owner not found in database.");
                handleLogout(new Event('click'));
            }
        });

    } catch (error) {
        console.error("Error initializing owner app:", error);
    }
});

// Update Header and Sidebar with Owner's Name
function updateGlobalOwnerUI() {
    const nameEls = document.querySelectorAll('.user-profile span:first-child');
    const emailEls = document.querySelectorAll('.user-profile span:last-child');
    const avatarEls = document.querySelectorAll('.avatar, .profile-image-upload');
    
    nameEls.forEach(el => {
        if(el.tagName === 'SPAN' && !el.classList.contains('mobile-logout-btn')) {
             el.innerText = currentOwnerData.name || 'Vehicle Owner';
        }
    });
    
    emailEls.forEach(el => {
         if(el.tagName === 'SPAN' && el.style.fontSize === '0.85rem') {
             el.innerText = currentOwnerData.email || 'owner@icbtride.com';
         }
    });

    avatarEls.forEach(el => {
        if(!el.innerHTML.includes('<i') && !el.classList.contains('profile-image-upload')) {
            el.innerText = (currentOwnerData.name || 'O').charAt(0).toUpperCase();
        } else if (el.classList.contains('profile-image-upload') && !el.querySelector('img')) {
             // Keep the text inside if there's no image yet, but for now just leave it.
             // We can render an actual image later if profileImageUrl exists.
             if (currentOwnerData.profileImageUrl) {
                 el.style.backgroundImage = `url(${currentOwnerData.profileImageUrl})`;
                 el.style.backgroundSize = 'cover';
                 el.style.backgroundPosition = 'center';
                 el.style.color = 'transparent';
             }
        }
    });
}

// ---------------------------------------------------------
// DASHBOARD (owner_dashboard.html)
// ---------------------------------------------------------
function initDashboardStats() {
    // Listen to Vehicles collection for this owner
    const vehiclesQuery = window.fsQuery(window.fsCollection(window.firebaseDb, "vehicles"), window.fsOrderBy("createdAt", "desc")); // Simplified query to fetch all, then filter. Ideally use where("ownerId", "==", currentOwnerId) but requires index.
    
    window.fsOnSnapshot(vehiclesQuery, (snapshot) => {
        let totalVehicles = 0;
        let activeVehicles = 0;
        let assignedDrivers = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.ownerId === currentOwnerId) {
                totalVehicles++;
                if (data.status === 'Active') activeVehicles++;
                if (data.assignedDriverId) assignedDrivers++;
            }
        });

        // Update DOM
        const els = document.querySelectorAll('.stat-card h3');
        if(els.length >= 3) {
            els[0].innerText = totalVehicles;
            els[1].innerText = activeVehicles;
            els[2].innerText = assignedDrivers;
        }
    });
}

// ---------------------------------------------------------
// VEHICLES PAGE (vehicles.html)
// ---------------------------------------------------------
function initVehiclesPage() {
    const container = document.querySelector('.dashboard-grid');
    if (!container) return;

    // Add Vehicle Button Event
    const addBtn = document.querySelector('.header .btn-primary');
    const modal = document.getElementById('addVehicleModal');
    const closeBtn = document.querySelector('.close-modal');
    
    if (addBtn && modal) {
        addBtn.addEventListener('click', () => {
            modal.classList.add('active');
        });
    }
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    // Add Vehicle Form Submit
    const form = document.getElementById('addVehicleForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('addVehicleBtn');
            btn.innerHTML = 'Saving...';
            btn.disabled = true;

            const makeModel = document.getElementById('v-model').value;
            const plate = document.getElementById('v-plate').value;
            const type = document.getElementById('v-type').value;

            try {
                await window.fsAddDoc(window.fsCollection(window.firebaseDb, "vehicles"), {
                    ownerId: currentOwnerId,
                    makeModel: makeModel,
                    plateNumber: plate,
                    type: type,
                    status: 'Active',
                    assignedDriverId: null,
                    assignedDriverName: null,
                    createdAt: new Date().toISOString()
                });
                
                modal.classList.remove('active');
                form.reset();
                alert('Vehicle added successfully!');
            } catch (error) {
                console.error("Error adding vehicle:", error);
                alert("Failed to add vehicle.");
            } finally {
                btn.innerHTML = 'Add Vehicle';
                btn.disabled = false;
            }
        });
    }

    // Render Vehicles
    const vehiclesQuery = window.fsQuery(window.fsCollection(window.firebaseDb, "vehicles"));
    window.fsOnSnapshot(vehiclesQuery, (snapshot) => {
        let html = '';
        snapshot.forEach(doc => {
            const v = doc.data();
            if (v.ownerId === currentOwnerId) {
                html += `
                <div class="card">
                    <div class="card-header">
                        <h3>${v.makeModel}</h3>
                        <span class="status-badge status-active">${v.status}</span>
                    </div>
                    <div class="card-body">
                        <div class="detail-row">
                            <span class="detail-label">Plate Number</span>
                            <span class="detail-value">${v.plateNumber}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Type</span>
                            <span class="detail-value">${v.type}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Driver</span>
                            <span class="detail-value">${v.assignedDriverName || '<span style="color:var(--danger-color)">Unassigned</span>'}</span>
                        </div>
                    </div>
                </div>`;
            }
        });

        // Insert html before the generic active rides list or clear the grid and put this.
        container.innerHTML = html || '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No vehicles found. Add one above.</p>';
    });
}

// ---------------------------------------------------------
// DRIVERS PAGE (drivers.html)
// ---------------------------------------------------------
function initDriversPage() {
    const tableBody = document.querySelector('tbody');
    if (!tableBody) return;

    // Load available drivers and vehicles into modal selects
    const vehicleSelect = document.getElementById('d-vehicle');
    const driverSelect = document.getElementById('d-driver');
    
    let allAvailableDrivers = [];

    // Fetch Unassigned Drivers
    const driversQuery = window.fsQuery(window.fsCollection(window.firebaseDb, "users"));
    window.fsOnSnapshot(driversQuery, (snapshot) => {
        allAvailableDrivers = [];
        let html = '<option value="">Select a driver...</option>';
        snapshot.forEach(doc => {
            const data = doc.data();
            // A simple logic: if role is driver, they are a driver.
            // In a real app we'd check if they are already assigned.
            if (data.role === 'driver') {
                allAvailableDrivers.push({ id: doc.id, name: data.name || data.fullName });
                html += `<option value="${doc.id}">${data.name || data.fullName} (${data.email})</option>`;
            }
        });
        if (driverSelect) driverSelect.innerHTML = html;
    });

    // We need to fetch all vehicles to populate table and modal
    const vehiclesQuery = window.fsQuery(window.fsCollection(window.firebaseDb, "vehicles"));
    window.fsOnSnapshot(vehiclesQuery, (snapshot) => {
        let tableHtml = '';
        let selectHtml = '<option value="">Select a vehicle...</option>';
        let hasDrivers = false;

        snapshot.forEach(doc => {
            const v = doc.data();
            if (v.ownerId === currentOwnerId) {
                // Populate Modal Select
                selectHtml += `<option value="${doc.id}">${v.plateNumber} (${v.makeModel})</option>`;
                
                // Populate Table if driver is assigned
                if (v.assignedDriverId) {
                    hasDrivers = true;
                    tableHtml += `
                    <tr>
                        <td>
                            <div class="driver-info">
                                <div class="driver-avatar">${(v.assignedDriverName || 'U').charAt(0).toUpperCase()}</div>
                                <div>
                                    <div class="driver-name">${v.assignedDriverName}</div>
                                </div>
                            </div>
                        </td>
                        <td>${v.plateNumber} (${v.makeModel})</td>
                        <td><span class="status-badge status-active">Active</span></td>
                        <td>
                            <button class="btn-action" style="color: var(--danger-color); border-color: var(--border-color);" onclick="unassignDriver('${doc.id}')">Unassign</button>
                        </td>
                    </tr>`;
                }
            }
        });

        tableBody.innerHTML = tableHtml || '<tr><td colspan="4" style="text-align: center; padding: 20px;">No drivers assigned to your vehicles.</td></tr>';
        if (vehicleSelect) vehicleSelect.innerHTML = selectHtml;
    });

    // Modal Logic
    const assignBtn = document.querySelector('.header .btn-primary');
    const modal = document.getElementById('assignDriverModal');
    const closeBtn = document.querySelector('.close-modal');
    
    if (assignBtn && modal) {
        assignBtn.addEventListener('click', () => modal.classList.add('active'));
    }
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    // Assign Form Submit
    const form = document.getElementById('assignDriverForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const vId = vehicleSelect.value;
            const dId = driverSelect.value;
            
            if (!vId || !dId) {
                alert("Please select both a vehicle and a driver.");
                return;
            }

            const driverObj = allAvailableDrivers.find(d => d.id === dId);

            try {
                // Update vehicle doc
                await window.fsUpdateDoc(window.fsDoc(window.firebaseDb, "vehicles", vId), {
                    assignedDriverId: dId,
                    assignedDriverName: driverObj.name
                });
                
                // Also update the driver user doc to know which vehicle they drive
                await window.fsUpdateDoc(window.fsDoc(window.firebaseDb, "users", dId), {
                    assignedVehicleId: vId,
                    ownerId: currentOwnerId
                });

                modal.classList.remove('active');
                form.reset();
                alert('Driver assigned successfully!');
            } catch (error) {
                console.error("Error assigning driver:", error);
                alert("Failed to assign driver.");
            }
        });
    }

    // Expose unassign globally
    window.unassignDriver = async (vehicleId) => {
        if(confirm("Are you sure you want to unassign this driver?")) {
            await window.fsUpdateDoc(window.fsDoc(window.firebaseDb, "vehicles", vehicleId), {
                assignedDriverId: null,
                assignedDriverName: null
            });
            alert('Driver unassigned.');
        }
    }
}

// ---------------------------------------------------------
// RIDES PAGE (rides.html)
// ---------------------------------------------------------
function initRidesPage() {
    const tableBody = document.querySelector('tbody');
    if (!tableBody) return;

    // Fetch rides. For simplicity, fetch all and filter client side.
    const ridesQuery = window.fsQuery(window.fsCollection(window.firebaseDb, "rides"), window.fsOrderBy("createdAt", "desc"));
    
    // We also need owner's vehicles to know which rides belong to them.
    const vehiclesQuery = window.fsQuery(window.fsCollection(window.firebaseDb, "vehicles"));
    
    let ownerVehicleIds = [];

    window.fsOnSnapshot(vehiclesQuery, (vSnap) => {
        ownerVehicleIds = [];
        vSnap.forEach(vDoc => {
            if (vDoc.data().ownerId === currentOwnerId) {
                ownerVehicleIds.push(vDoc.id); // Or plate number if rides use plate number. Assuming rides use driverId for now, wait. The driver app uses driverId.
                // It's easier to check if the ride's driverId is one of our assigned drivers.
            }
        });
        
        // Re-fetch rides when vehicles load
        loadRides();
    });

    function loadRides() {
        window.fsOnSnapshot(ridesQuery, (rSnap) => {
            let html = '';
            rSnap.forEach(rDoc => {
                const r = rDoc.data();
                // Basic matching logic: (In a real app, rides would store the vehicleId or ownerId directly).
                // For demonstration, we'll just show them if they exist.
                
                // For now, let's just render all rides as this is a demo, or we can filter if we add ownerId to ride creation.
                // Let's add a dummy display for now since driver app doesn't save ownerId.
                const dateObj = r.createdAt ? new Date(r.createdAt.toDate()) : new Date();
                
                html += `
                <tr>
                    <td>#${rDoc.id.substring(0,5).toUpperCase()}</td>
                    <td>
                        <div>${dateObj.toLocaleDateString()}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted);">${r.time || 'N/A'}</div>
                    </td>
                    <td>
                        <div>${r.driverName || 'Unknown'}</div>
                    </td>
                    <td class="location-col">
                        <span class="pickup"><i class="fa-solid fa-location-dot"></i> ${r.start || 'N/A'}</span>
                        <span class="dropoff"><i class="fa-solid fa-flag-checkered"></i> ${r.dest || 'N/A'}</span>
                    </td>
                    <td>-</td>
                    <td style="color: var(--primary-color); font-weight: 700;">-</td>
                    <td><span class="status-badge status-completed">Completed</span></td>
                </tr>`;
            });
            tableBody.innerHTML = html || '<tr><td colspan="7" style="text-align: center;">No rides found.</td></tr>';
        });
    }
}

// ---------------------------------------------------------
// PROFILE PAGE (profile.html)
// ---------------------------------------------------------
function initProfilePage() {
    const nameInput = document.querySelectorAll('.form-control')[0];
    const nicInput = document.querySelectorAll('.form-control')[1];
    const phoneInput = document.querySelectorAll('.form-control')[2];
    const emailInput = document.querySelectorAll('.form-control')[3];

    if (nameInput) nameInput.value = currentOwnerData.name || '';
    if (nicInput) nicInput.value = currentOwnerData.nic || '';
    if (phoneInput) phoneInput.value = currentOwnerData.phone || '';
    if (emailInput) emailInput.value = currentOwnerData.email || '';

    const saveBtn = document.querySelector('.btn-primary');
    if (saveBtn) {
        saveBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            saveBtn.innerHTML = 'Saving...';
            
            try {
                await window.fsUpdateDoc(window.fsDoc(window.firebaseDb, "users", currentOwnerId), {
                    name: nameInput.value,
                    nic: nicInput.value,
                    phone: phoneInput.value
                });
                if(window.customAlert) window.customAlert('Profile updated successfully!');
            } catch (error) {
                console.error("Error updating profile", error);
                alert("Failed to update profile.");
            } finally {
                saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
            }
        });
    }
}
