/**
 * ICBT Ride - REST API Client Service
 * Connects frontend dashboards with backend REST API endpoints.
 */

class RestApiService {
    constructor() {
        // Target Express REST API server port (default 5000) or current host
        this.apiPort = 5000;
        this.baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? `http://${window.location.hostname}:${this.apiPort}`
            : window.location.origin;

        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    /**
     * Helper: Execute Generic RESTful HTTP Request
     */
    async request(endpoint, method = 'GET', body = null, customHeaders = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
        
        // Retrieve session token / user info for auth headers
        let authHeaders = {};
        const activeUser = localStorage.getItem('loggedInUser') || 
                           localStorage.getItem('loggedInUser_passenger') || 
                           localStorage.getItem('loggedInUser_driver') ||
                           localStorage.getItem('loggedInUser_owner') ||
                           localStorage.getItem('loggedInUser_admin');
        
        if (activeUser) {
            try {
                const u = JSON.parse(activeUser);
                if (u.token) authHeaders['Authorization'] = `Bearer ${u.token}`;
                if (u.id || u.uid) authHeaders['x-user-id'] = u.id || u.uid;
                if (u.role) authHeaders['x-user-role'] = u.role;
                if (u.email) authHeaders['x-user-email'] = u.email;
            } catch (e) {}
        }

        // Fast timeout abort controller (400ms) to ensure ZERO page lag or blocking
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 400);

        const options = {
            method: method.toUpperCase(),
            headers: { ...this.defaultHeaders, ...authHeaders, ...customHeaders },
            signal: controller.signal
        };

        if (body && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: Request failed`);
            }
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            // Non-blocking fallback
            throw error;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. AUTHENTICATION REST API
    // ──────────────────────────────────────────────────────────────────────────

    async register(userData) {
        try {
            return await this.request('/api/auth/register', 'POST', userData);
        } catch (e) {
            if (window.db) {
                const uid = `user_${Date.now()}`;
                await window.db.collection('users').doc(uid).set({ ...userData, uid, createdAt: new Date().toISOString() });
                return { success: true, data: { uid, ...userData } };
            }
            throw e;
        }
    }

    async login(email) {
        return await this.request('/api/auth/login', 'POST', { email });
    }

    async getMe() {
        return await this.request('/api/auth/me', 'GET');
    }

    async verifyToken(idToken) {
        return await this.request('/api/auth/verify-token', 'POST', { idToken });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. RIDES REST API
    // ──────────────────────────────────────────────────────────────────────────

    async getRides(filters = {}) {
        const queryParams = new URLSearchParams();
        if (filters.origin) queryParams.append('origin', filters.origin);
        if (filters.destination) queryParams.append('destination', filters.destination);
        if (filters.date) queryParams.append('date', filters.date);

        const endpoint = `/api/rides${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        try {
            const res = await this.request(endpoint, 'GET');
            return res.data || [];
        } catch (e) {
            if (window.db) {
                const snap = await window.db.collection('rides').where('status', '==', 'active').get();
                const rides = [];
                snap.forEach(doc => rides.push({ id: doc.id, ...doc.data() }));
                return rides;
            }
            throw e;
        }
    }

    async createRide(ridePayload) {
        try {
            return await this.request('/api/rides', 'POST', ridePayload);
        } catch (e) {
            if (window.db) {
                const docRef = await window.db.collection('rides').add({
                    ...ridePayload,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                return { success: true, id: docRef.id, message: "Ride created" };
            }
            throw e;
        }
    }

    async getRideById(id) {
        return await this.request(`/api/rides/${id}`, 'GET');
    }

    async joinRide(rideId, bookingPayload) {
        return await this.request(`/api/rides/${rideId}/join`, 'POST', bookingPayload);
    }

    async acceptBooking(rideId, bookingId) {
        return await this.request(`/api/rides/${rideId}/accept`, 'POST', { bookingId });
    }

    async rejectBooking(rideId, bookingId, reason) {
        return await this.request(`/api/rides/${rideId}/reject`, 'POST', { bookingId, reason });
    }

    async completeRide(rideId, completionData) {
        return await this.request(`/api/rides/${rideId}/complete`, 'POST', completionData);
    }

    async getDriverRides(driverId) {
        return await this.request(`/api/rides/driver/${driverId}`, 'GET');
    }

    async getPassengerBookings(passengerId) {
        return await this.request(`/api/rides/passenger/${passengerId}`, 'GET');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. FUEL QUOTA & ODD-EVEN REST API
    // ──────────────────────────────────────────────────────────────────────────

    async getFuelQuotaStatus(vehicleId) {
        return await this.request(`/api/fuel/quota/${vehicleId}`, 'GET');
    }

    async checkOddEven(plateNumber) {
        return await this.request(`/api/fuel/odd-even/${encodeURIComponent(plateNumber)}`, 'GET');
    }

    async validateRideFuel(validationPayload) {
        return await this.request('/api/fuel/validate', 'POST', validationPayload);
    }

    async refuelVehicle(refuelPayload) {
        return await this.request('/api/fuel/refuel', 'POST', refuelPayload);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. FLEET & DRIVER ASSIGNMENTS REST API (OWNER)
    // ──────────────────────────────────────────────────────────────────────────

    async getVehicles() {
        return await this.request('/api/vehicles', 'GET');
    }

    async getOwnerVehicles(ownerId) {
        return await this.request(`/api/vehicles/owner/${ownerId}`, 'GET');
    }

    async addVehicle(vehicleData) {
        return await this.request('/api/vehicles', 'POST', vehicleData);
    }

    async assignDriver(assignmentData) {
        return await this.request('/api/assignments', 'POST', assignmentData);
    }

    async getOwnerAssignments(ownerId) {
        return await this.request(`/api/assignments/owner/${ownerId}`, 'GET');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. CHAT & MESSAGING REST API
    // ──────────────────────────────────────────────────────────────────────────

    async getUserChats(userId) {
        return await this.request(`/api/chats/${userId}`, 'GET');
    }

    async getChatMessages(chatId) {
        return await this.request(`/api/chats/${chatId}/messages`, 'GET');
    }

    async sendChatMessage(chatId, messageData) {
        return await this.request(`/api/chats/${chatId}/messages`, 'POST', messageData);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. ADMIN & STATS REST API
    // ──────────────────────────────────────────────────────────────────────────

    async getAdminStats() {
        return await this.request('/api/admin/stats', 'GET');
    }

    async getComplaints() {
        return await this.request('/api/admin/complaints', 'GET');
    }

    async resolveComplaint(id, notes) {
        return await this.request(`/api/admin/complaints/${id}/resolve`, 'POST', { resolutionNotes: notes });
    }

    async getAnnouncements() {
        return await this.request('/api/admin/announcements', 'GET');
    }

    async createAnnouncement(announcementData) {
        return await this.request('/api/admin/announcements', 'POST', announcementData);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7. EXTERNAL REST API: OPENSTREETMAP GEOCODING
    // ──────────────────────────────────────────────────────────────────────────

    async geocodeLocation(queryCity) {
        if (!queryCity) return null;
        const encoded = encodeURIComponent(`${queryCity}, Sri Lanka`);
        const endpoint = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`;

        try {
            const data = await this.request(endpoint, 'GET', null, {
                'User-Agent': 'ICBTRide-CarpoolingApp/1.0'
            });

            if (Array.isArray(data) && data.length > 0) {
                return {
                    name: data[0].display_name,
                    lat: parseFloat(data[0].lat),
                    lon: parseFloat(data[0].lon)
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    }
}

// Export singleton globally
window.RestApiService = new RestApiService();
