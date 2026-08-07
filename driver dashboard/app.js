// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCDNy7JdfdBe_g_PC6PkSKeI7bajYen7_8",
    authDomain: "icbtride.firebaseapp.com",
    projectId: "icbtride",
    storageBucket: "icbtride.firebasestorage.app",
    messagingSenderId: "135772791460",
    appId: "1:135772791460:web:36e9ea5104c4ad8206bc31",
    measurementId: "G-GS4SQESX7F"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Mock Data for other sections (Requests, Notifications) - Will be replaced later

const mockPassengerRequests = [
    { id: 101, rideId: 1, name: 'Saman Perera', status: 'pending' },
    { id: 102, rideId: 1, name: 'Nimal Silva', status: 'accepted' },
    { id: 103, rideId: 2, name: 'Kamal Bandara', status: 'pending' }
];

const mockNotifications = [
    { title: 'System Update', message: 'Your license was verified successfully.', time: '2 hours ago', unread: true },
    { title: 'New Ride Match', message: 'Saman Perera matches your route.', time: '5 hours ago', unread: true },
    { title: 'Reminder', message: 'Don\'t forget to update your vehicle registration.', time: '1 day ago', unread: false }
];

function renderActiveRides(ridesData) {
    const activeContainer = document.getElementById('activeRidesContainer');
    const historyContainer = document.getElementById('rideHistoryContainer');
    
    if (!activeContainer && !historyContainer) return;

    if (!ridesData || ridesData.length === 0) {
        const emptyMsg = '<p style="color: var(--text-muted); text-align: center; margin-top: 15px;">No rides found.</p>';
        if (activeContainer) activeContainer.innerHTML = emptyMsg;
        if (historyContainer) historyContainer.innerHTML = emptyMsg;
        return;
    }

    let html = '';
    ridesData.forEach(ride => {
        html += `
            <div class="list-item">
                <div class="list-item-header">
                    <div>
                        <div style="font-weight: 600;">${ride.start} <i class="fa-solid fa-arrow-right" style="margin: 0 5px; color: var(--text-muted); font-size: 0.8rem;"></i> ${ride.dest}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 5px;"><i class="fa-regular fa-calendar"></i> ${ride.date} | <i class="fa-regular fa-clock"></i> ${ride.time}</div>
                    </div>
                    <span class="badge" style="background: rgba(56, 189, 248, 0.2); color: var(--primary-color);">${ride.seats} Seats Left</span>
                </div>
            </div>
        `;
    });
    
    if (activeContainer) activeContainer.innerHTML = html;
    if (historyContainer) historyContainer.innerHTML = html;
}

function renderPassengerRequests() {
    const container = document.getElementById('passengerRequestsContainer');
    if (!container) return;

    if (mockPassengerRequests.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 15px;">No passenger requests yet.</p>';
        return;
    }

    let html = '';
    mockPassengerRequests.forEach(req => {
        let buttons = '';
        let badge = '';

        if (req.status === 'pending') {
            badge = '<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: var(--danger-color);">Pending</span>';
            buttons = `
                <button class="btn btn-sm btn-success" onclick="acceptRequest(${req.id})">Accept</button>
                <button class="btn btn-sm btn-danger" onclick="rejectRequest(${req.id})">Reject</button>
            `;
        } else if (req.status === 'accepted') {
            badge = '<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success-color);">Accepted</span>';
            buttons = `
                <button class="btn btn-sm btn-primary" onclick="contactPassenger(${req.id})">Contact</button>
            `;
        }

        html += `
            <div class="list-item">
                <div class="list-item-header">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="avatar" style="width: 35px; height: 35px; font-size: 0.9rem;">${req.name.charAt(0)}</div>
                        <div>
                            <div style="font-weight: 600;">${req.name}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">For Ride ID: ${req.rideId}</div>
                        </div>
                    </div>
                    ${badge}
                </div>
                <div class="list-item-actions">
                    ${buttons}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;

    if (mockNotifications.length === 0) {
        list.innerHTML = '<p style="padding: 15px 20px; color: var(--text-muted); text-align: center;">No new notifications</p>';
        return;
    }

    let html = '';
    mockNotifications.forEach(notif => {
        const iconColor = notif.unread ? 'var(--primary-color)' : 'var(--text-muted)';
        html += `
            <div class="notification-item">
                <div style="color: ${iconColor}; font-size: 1.2rem; margin-top: 3px;">
                    <i class="fa-solid fa-envelope"></i>
                </div>
                <div>
                    <div style="font-weight: 600; font-size: 0.95rem; color: ${notif.unread ? 'var(--text-main)' : 'var(--text-muted)'}">${notif.title}</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 3px;">${notif.message}</div>
                    <div style="font-size: 0.75rem; color: var(--primary-color); margin-top: 5px;">${notif.time}</div>
                </div>
            </div>
        `;
    });
    list.innerHTML = html;
}

// Dummy Action Functions
function acceptRequest(id) {
    alert('Request ' + id + ' Accepted! (Mock Action)');
}

function rejectRequest(id) {
    alert('Request ' + id + ' Rejected! (Mock Action)');
}

function contactPassenger(id) {
    alert('Contacting passenger ' + id + '... (Mock Action)');
}

function contactAdminForDocs(docName) {
    alert(`Please contact the Administrator to update your ${docName}. Verified documents cannot be changed directly for security reasons.`);
}

// Initialize Dashboard Logic
document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Firestore Real-time Listener for Rides
    const ridesRef = db.collection('rides').orderBy('createdAt', 'desc');
    ridesRef.onSnapshot((snapshot) => {
        const rides = [];
        snapshot.forEach((doc) => {
            rides.push({ id: doc.id, ...doc.data() });
        });
        renderActiveRides(rides); // Re-render whenever DB changes
    }, (error) => {
        console.error("Error fetching rides: ", error);
        // If it fails (e.g. permission/config issue), show a nice error in the UI
        const container = document.getElementById('activeRidesContainer');
        if(container) {
            container.innerHTML = '<p style="color: var(--danger-color); text-align: center; margin-top: 15px;">Database connection error. Check your Firebase config.</p>';
        }
    });

    // Render other mock data
    renderPassengerRequests();
    
    // Load Profile Data from Firestore
    const profileNameEl = document.getElementById('profileName');
    const driverStatusEl = document.getElementById('driverStatus');
    const avatarInitialsEl = document.getElementById('avatarInitials');
    const driverId = 'driver123'; // Mock driver ID

    db.collection('drivers').doc(driverId).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            
            // Update Header UI
            if (profileNameEl) profileNameEl.innerText = data.fullName || 'Driver Name';
            if (avatarInitialsEl) {
                const nameStr = data.fullName || 'D';
                avatarInitialsEl.innerText = nameStr.charAt(0).toUpperCase();
            }
            if (driverStatusEl) driverStatusEl.innerHTML = '<span style="color: var(--success-color);">Verified Driver</span>';

            // Update form inputs if they exist (on profile.html)
            const inputName = document.getElementById('profileFullName');
            const inputPhone = document.getElementById('profilePhone');
            const inputVehicle = document.getElementById('profileVehicle');
            const inputPlate = document.getElementById('profilePlate');
            
            if (inputName) inputName.value = data.fullName || '';
            if (inputPhone) inputPhone.value = data.phoneNumber || '';
            if (inputVehicle) inputVehicle.value = data.vehicleModel || '';
            if (inputPlate) inputPlate.value = data.plateNumber || '';
            
            // Update Document Verification Status UI if they exist (profile.html)
            const dlStatus = document.getElementById('dlStatus');
            const vrStatus = document.getElementById('vrStatus');
            if (dlStatus && data.drivingLicenseStatus) {
                dlStatus.innerHTML = `<span style="color: var(--success-color);"><i class="fa-solid fa-circle-check"></i> ${data.drivingLicenseStatus}</span>`;
            }
            if (vrStatus && data.vehicleRegStatus) {
                vrStatus.innerHTML = `<span style="color: var(--success-color);"><i class="fa-solid fa-circle-check"></i> ${data.vehicleRegStatus}</span>`;
            }
            
            // Update Dashboard Profile Widget (driver_dashboard.html)
            const dashVehicle = document.getElementById('vehicleModel');
            const dashPlate = document.getElementById('plateNumber');
            const dashSeats = document.getElementById('availableSeats');
            const dashLicStatus = document.getElementById('licenseStatus');
            const dashRegStatus = document.getElementById('vehicleRegStatus');
            
            if (dashVehicle) dashVehicle.innerText = data.vehicleModel || '--';
            if (dashPlate) dashPlate.innerText = data.plateNumber || '--';
            if (dashSeats) dashSeats.innerText = '3'; // Default mock seats
            
            if (dashLicStatus && data.drivingLicenseStatus) {
                dashLicStatus.innerHTML = `<i class="fa-solid fa-check"></i> Uploaded`;
                dashLicStatus.style.background = 'rgba(16, 185, 129, 0.2)';
                dashLicStatus.style.color = 'var(--success-color)';
            }
            if (dashRegStatus && data.vehicleRegStatus) {
                dashRegStatus.innerHTML = `<i class="fa-solid fa-check"></i> Uploaded`;
                dashRegStatus.style.background = 'rgba(16, 185, 129, 0.2)';
                dashRegStatus.style.color = 'var(--success-color)';
            }
        } else {
            // Document doesn't exist, use fallback
            if (profileNameEl) profileNameEl.innerText = 'Kamal Perera';
            if (driverStatusEl) driverStatusEl.innerHTML = '<span style="color: var(--success-color);">Verified Driver</span>';
            if (avatarInitialsEl) avatarInitialsEl.innerText = 'K';
            
            // Optionally, create the doc so it exists for the first time
            db.collection('drivers').doc(driverId).set({
                fullName: 'Kamal Perera',
                phoneNumber: '0712345678',
                vehicleModel: 'Honda Fit',
                plateNumber: 'CBA-1234'
            });
        }
    });

    // Handle Edit Profile Form Submit (Main Page)
    const editProfileFormMain = document.getElementById('editProfileFormMain');
    if (editProfileFormMain) {
        editProfileFormMain.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const fullName = document.getElementById('profileFullName').value;
            const phoneNumber = document.getElementById('profilePhone').value;
            const vehicleModel = document.getElementById('profileVehicle').value;
            const plateNumber = document.getElementById('profilePlate').value;

            // Save to Firestore
            db.collection('drivers').doc(driverId).set({
                fullName: fullName,
                phoneNumber: phoneNumber,
                vehicleModel: vehicleModel,
                plateNumber: plateNumber,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true })
            .then(() => {
                if (typeof showSuccessModal === 'function') {
                    showSuccessModal('Profile Updated', 'Your profile details have been saved successfully.');
                } else {
                    alert('Profile updated successfully!');
                }
            })
            .catch((error) => {
                console.error("Error updating profile: ", error);
                alert("Error saving profile details.");
            });
        });
    }

    // Document Upload Logic
    const dlInput = document.getElementById('dlInput');
    const vrInput = document.getElementById('vrInput');
    const dlStatusEl = document.getElementById('dlStatus');
    const vrStatusEl = document.getElementById('vrStatus');

    function handleFileUpload(inputElement, statusElement, docType) {
        if (!inputElement || !statusElement) return;
        
        inputElement.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!firebase.storage) {
                alert("Storage module not loaded.");
                return;
            }

            statusElement.innerHTML = '<span style="color: var(--primary-color);">Uploading... <i class="fa-solid fa-spinner fa-spin"></i></span>';
            
            const storageRef = firebase.storage().ref();
            const fileRef = storageRef.child(`driver_docs/${driverId}/${docType}_${file.name}`);

            fileRef.put(file).then((snapshot) => {
                return snapshot.ref.getDownloadURL();
            }).then((downloadURL) => {
                // Save URL to Firestore
                return db.collection('drivers').doc(driverId).set({
                    [docType + 'Url']: downloadURL,
                    [docType + 'Status']: 'Uploaded - Pending Verification'
                }, { merge: true });
            }).then(() => {
                statusElement.innerHTML = '<span style="color: var(--success-color);"><i class="fa-solid fa-circle-check"></i> Uploaded successfully</span>';
                if (typeof showSuccessModal === 'function') {
                    showSuccessModal('Document Uploaded', 'Your document has been uploaded and is pending verification.');
                }
            }).catch((error) => {
                console.error("Upload failed:", error);
                statusElement.innerHTML = '<span style="color: var(--danger-color);"><i class="fa-solid fa-circle-exclamation"></i> Upload failed. Rules error?</span>';
                alert("Upload Failed! Make sure Firebase Storage Rules are set to allow read/write without authentication for this test.");
            });
        });
    }
    
    handleFileUpload(dlInput, dlStatusEl, 'drivingLicense');
    handleFileUpload(vrInput, vrStatusEl, 'vehicleReg');

    // Mock Sustainability Metrics
    const co2El = document.getElementById('co2Saved');
    const fuelEl = document.getElementById('fuelSaved');
    if (co2El) co2El.innerText = '12.5';
    if (fuelEl) fuelEl.innerText = '5.2';

    // Handle Ride Offer Form
    const offerRideForm = document.getElementById('offerRideForm');
    if (offerRideForm) {
        offerRideForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const start = document.getElementById('offerStart').value;
            const dest = document.getElementById('offerDest').value;
            const date = document.getElementById('offerDate').value;
            const time = document.getElementById('offerTime').value;
            const seats = document.getElementById('offerSeats').value;

            if(!start || !dest || !date || !time || !seats) {
                alert("Please fill in all fields.");
                return;
            }

            // Save to Firestore
            const newRide = {
                start: start,
                dest: dest,
                date: date,
                time: time,
                seats: parseInt(seats),
                driverId: 'driver123', // Mock driver ID for now
                driverName: 'Kamal Perera',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            db.collection('rides').add(newRide)
            .then((docRef) => {
                showSuccessModal('Ride Published!', 'Your ride was successfully added to the database.');
                offerRideForm.reset();
            })
            .catch((error) => {
                console.error("Error adding document: ", error);
                alert("Error saving ride. Please check console.");
            });
        });
    }

    // --- Success Modal Logic ---
    const successModal = document.getElementById('successModal');
    const successModalBtn = document.getElementById('successModalBtn');
    
    window.showSuccessModal = function(title, message) {
        if (!successModal) return;
        document.getElementById('successModalTitle').innerText = title || 'Success!';
        document.getElementById('successModalMessage').innerText = message || 'Action completed successfully.';
        
        // Reset animation by cloning and replacing the icon
        const icon = successModal.querySelector('.success-icon');
        const newIcon = icon.cloneNode(true);
        icon.parentNode.replaceChild(newIcon, icon);

        successModal.classList.add('active');
    };

    if (successModalBtn) {
        successModalBtn.addEventListener('click', () => {
            successModal.classList.remove('active');
        });
    }

    // --- Notification Dropdown Logic ---
    renderNotifications();
    const bellIcon = document.getElementById('bellIcon');
    const dropdown = document.getElementById('notificationDropdown');
    
    if (bellIcon && dropdown) {
        bellIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }

    // --- Mobile Sidebar Logic ---
    // (Removed because we are using a Bottom Navigation Bar on mobile now)

    // --- Profile Modal Logic ---
    const profileModal = document.getElementById('profileModal');
    const avatarInitials = document.getElementById('avatarInitials');
    const profileTriggerText = document.getElementById('profileTriggerText');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const editProfileForm = document.getElementById('editProfileForm');

    // Open Modal
    function openProfileModal() {
        if (!profileModal) return;
        profileModal.classList.add('active');
        
        // Pre-fill inputs with current mock data
        document.getElementById('editNameInput').value = document.getElementById('profileName').innerText;
        document.getElementById('editVehicleInput').value = document.getElementById('vehicleModel').innerText !== '--' ? document.getElementById('vehicleModel').innerText : 'Toyota Prius';
        document.getElementById('editPlateInput').value = document.getElementById('plateNumber').innerText !== '--' ? document.getElementById('plateNumber').innerText : 'CAA-1234';
        document.getElementById('editSeatsInput').value = document.getElementById('availableSeats').innerText !== '--' ? document.getElementById('availableSeats').innerText : 3;
    }

    if (avatarInitials) avatarInitials.addEventListener('click', openProfileModal);
    if (profileTriggerText) profileTriggerText.addEventListener('click', openProfileModal);

    // Close Modal
    function closeProfileModal() {
        if (profileModal) profileModal.classList.remove('active');
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeProfileModal);
    
    // Close modal when clicking outside of it
    if (profileModal) {
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                closeProfileModal();
            }
        });
    }

    // Handle Form Submit (Save Changes)
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent page reload
            
            // Get values
            const newName = document.getElementById('editNameInput').value;
            const newVehicle = document.getElementById('editVehicleInput').value;
            const newPlate = document.getElementById('editPlateInput').value;
            const newSeats = document.getElementById('editSeatsInput').value;

            // Update UI elements instantly
            const nameEl = document.getElementById('profileName');
            const initialsEl = document.getElementById('avatarInitials');
            const vModelEl = document.getElementById('vehicleModel');
            const pNumEl = document.getElementById('plateNumber');
            const aSeatsEl = document.getElementById('availableSeats');

            if (nameEl) nameEl.innerText = newName;
            if (initialsEl) initialsEl.innerText = newName.charAt(0).toUpperCase();
            if (vModelEl) vModelEl.innerText = newVehicle;
            if (pNumEl) pNumEl.innerText = newPlate;
            if (aSeatsEl) aSeatsEl.innerText = newSeats;

            // Close the modal and show a nice little alert
            closeProfileModal();
            // Using a simple timeout to let the modal close smoothly before showing the alert
            setTimeout(() => {
                showSuccessModal('Profile Updated', 'Your details have been updated successfully.');
            }, 300);
        });
    }
});
