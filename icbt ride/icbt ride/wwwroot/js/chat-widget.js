/**
 * ICBT Ride - Real-time Chat Module
 * Manages floating messenger UI, real-time message synchronization, and access permissions.
 */

(function() {
    function getLoggedInUser() {
        try {
            const isDriverPath = window.location.pathname.includes('/driver-dashboard');
            const isPassengerPath = window.location.pathname.includes('/passenger-dashboard');

            if (isDriverPath) {
                const driverRaw = localStorage.getItem('loggedInUser_driver');
                if (driverRaw) {
                    const u = JSON.parse(driverRaw);
                    return { ...u, uid: String(u.uid || u.id || '') };
                }
            } else if (isPassengerPath) {
                const passRaw = localStorage.getItem('loggedInUser_passenger');
                if (passRaw) {
                    const u = JSON.parse(passRaw);
                    return { ...u, uid: String(u.uid || u.id || '') };
                }
            }

            const raw = localStorage.getItem('loggedInUser');
            if (raw) {
                const u = JSON.parse(raw);
                const uid = u.uid || u.id || localStorage.getItem('loggedInUserId');
                return { ...u, uid: String(uid || '') };
            }
            const legacyId = localStorage.getItem('loggedInUserId');
            if (legacyId) {
                return { 
                    uid: String(legacyId), 
                    name: 'User', 
                    role: localStorage.getItem('loggedInUserRole') || 'passenger' 
                };
            }
        } catch (e) {
            console.error("Error parsing loggedInUser:", e);
        }
        return null;
    }

    function initChatWidget() {
        if (document.getElementById('chat-widget-btn')) return; // Already initialized

        const chatHtml = `
            <div id="chat-widget-btn" title="Open Messages">
                <i class="fa-regular fa-comment-dots"></i>
                <div id="chat-unread-dot"></div>
            </div>
            <div id="chat-widget-panel">
                <!-- Header -->
                <div class="chat-header">
                    <div><i class="fa-solid fa-messages"></i> Messages</div>
                    <button class="chat-close-btn" id="chat-close-btn"><i class="fa-solid fa-xmark"></i></button>
                </div>
                
                <!-- List View -->
                <div id="chat-list-view">
                    <div style="padding: 25px 20px; text-align: center; color: #64748b; font-size: 0.9rem;">
                        <i class="fa-solid fa-spinner fa-spin"></i> Loading messages...
                    </div>
                </div>
                
                <!-- Thread View -->
                <div id="chat-thread-view" style="display: none;">
                    <div class="thread-header">
                        <button class="thread-back-btn" id="thread-back-btn"><i class="fa-solid fa-arrow-left"></i></button>
                        <div class="thread-user-info-box">
                            <div class="thread-user-title-row">
                                <span class="thread-user-info" id="thread-user-name">User Name</span>
                                <span class="thread-role-badge" id="thread-role-badge">ROLE</span>
                            </div>
                            <div class="thread-status" id="thread-user-status">
                                <span class="thread-status-dot"></span>
                                <span id="thread-status-text">Checking status...</span>
                            </div>
                        </div>
                    </div>
                    <div class="chat-messages" id="chat-thread-messages">
                        <!-- Messages go here -->
                    </div>
                    <div class="chat-access-banner" id="chat-access-banner">
                        <i class="fa-solid fa-shield-halved"></i> <span id="chat-banner-text">Verifying ride access...</span>
                    </div>
                    <div class="chat-input-area">
                        <input type="text" id="chat-msg-input" placeholder="Type a message...">
                        <button id="chat-send-btn"><i class="fa-solid fa-paper-plane"></i></button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', chatHtml);

        const chatBtn = document.getElementById('chat-widget-btn');
        const chatPanel = document.getElementById('chat-widget-panel');
        const closeBtn = document.getElementById('chat-close-btn');
        const unreadDot = document.getElementById('chat-unread-dot');
        const listView = document.getElementById('chat-list-view');
        const threadView = document.getElementById('chat-thread-view');
        const backBtn = document.getElementById('thread-back-btn');
        const messagesContainer = document.getElementById('chat-thread-messages');
        const msgInput = document.getElementById('chat-msg-input');
        const sendBtn = document.getElementById('chat-send-btn');
        const threadUserName = document.getElementById('thread-user-name');
        const threadRoleBadge = document.getElementById('thread-role-badge');
        const threadUserStatus = document.getElementById('thread-user-status');
        const threadStatusText = document.getElementById('thread-status-text');
        const accessBanner = document.getElementById('chat-access-banner');
        const bannerText = document.getElementById('chat-banner-text');

        let currentChatId = null;
        let currentOtherUserId = null;
        let currentOtherUserName = null;
        let currentOtherUserRole = null;
        let messagesUnsubscribe = null;
        let statusUnsubscribe = null;
        let chatsUnsubscribe = null;

        // Toggle Widget
        if (chatBtn) {
            chatBtn.addEventListener('click', () => {
                chatPanel.classList.toggle('active');
                if (chatPanel.classList.contains('active')) {
                    showListView();
                    updateLastActive();
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                chatPanel.classList.remove('active');
            });
        }

        if (backBtn) {
            backBtn.addEventListener('click', showListView);
        }

        function showListView() {
            listView.style.display = 'block';
            threadView.style.display = 'none';
            currentChatId = null;
            currentOtherUserId = null;
            if (messagesUnsubscribe) { messagesUnsubscribe(); messagesUnsubscribe = null; }
            if (statusUnsubscribe) { statusUnsubscribe(); statusUnsubscribe = null; }
        }

        function formatTime(timestamp) {
            if (!timestamp) return '';
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // ─── Access Control Engine ───────────────────────────────────────────
        // Real-time listener for chat authorization between passenger & driver
        let accessUnsubscribe = null;

        async function checkActiveFallback(pId, dId, onStatusChange) {
            try {
                // 1. Check bookings
                const bSnap = await window.db.collection('bookings')
                    .where('passengerId', '==', pId)
                    .where('driverId', '==', dId)
                    .get();

                const allBookings = [];
                bSnap.forEach(doc => allBookings.push({ id: doc.id, ...doc.data() }));
                allBookings.sort((a, b) => (b.timestamp?.toMillis ? b.timestamp.toMillis() : 0) - (a.timestamp?.toMillis ? a.timestamp.toMillis() : 0));

                if (allBookings.length > 0) {
                    const latest = allBookings[0];
                    const st = (latest.status || 'upcoming').toLowerCase();
                    if (st === 'upcoming' || st === 'active' || st === 'in-progress') {
                        onStatusChange({ allowed: true, isPast: false, status: 'Online', bannerType: 'info', rideId: latest.rideId });
                        return;
                    }
                }

                // 2. Check RideRequests (pending broadcasts or accepted by dId)
                const rSnap = await window.db.collection('RideRequests').where('passengerId', '==', pId).get();
                let activeReq = null;
                rSnap.forEach(rd => {
                    const rData = rd.data();
                    const rst = (rData.status || 'pending').toLowerCase();
                    if ((rData.driverId === dId || !rData.driverId || rData.driverId === '') && (rst === 'pending' || rst === 'accepted' || rst === 'active')) {
                        activeReq = { id: rd.id, ...rData };
                    }
                });

                if (activeReq) {
                    onStatusChange({ allowed: true, isPast: false, status: 'Online', bannerType: 'info', requestId: activeReq.id });
                    return;
                }

                // 3. Check legacy requests
                const lSnap = await window.db.collection('requests').where('passengerId', '==', pId).get();
                let activeLeg = null;
                lSnap.forEach(rd => {
                    const lData = rd.data();
                    const lst = (lData.status || 'pending').toLowerCase();
                    if ((lData.driverId === dId || !lData.driverId || lData.driverId === '') && (lst === 'pending' || lst === 'accepted' || lst === 'active')) {
                        activeLeg = { id: rd.id, ...lData };
                    }
                });

                if (activeLeg) {
                    onStatusChange({ allowed: true, isPast: false, status: 'Online', bannerType: 'info', requestId: activeLeg.id });
                    return;
                }

                onStatusChange({ allowed: false, isPast: true, status: '🔒 Trip Completed - Chat Closed (Read-Only)', bannerType: 'info' });
            } catch (e) {
                onStatusChange({ allowed: false, isPast: true, status: '🔒 Trip Completed - Chat Closed (Read-Only)', bannerType: 'info' });
            }
        }

        function bindChatAccessControl(pId, dId, onStatusChange, specificChatDoc = null) {
            if (accessUnsubscribe) {
                accessUnsubscribe();
                accessUnsubscribe = null;
            }

            const currentUser = getLoggedInUser();
            if (!currentUser || (currentUser.role !== 'passenger' && currentUser.role !== 'driver')) {
                onStatusChange({
                    allowed: false,
                    isPast: true,
                    status: '🔒 You are not authorized to chat',
                    bannerType: 'danger'
                });
                return;
            }

            if (!window.db || !pId || !dId) {
                onStatusChange({
                    allowed: false,
                    isPast: true,
                    status: '🔒 Chat unavailable',
                    bannerType: 'danger'
                });
                return;
            }

            const specificRideId = specificChatDoc?.rideId;
            const specificBookingId = specificChatDoc?.bookingId;
            const specificReqId = specificChatDoc?.requestId || (specificChatDoc?.id && !specificRideId && !specificBookingId ? specificChatDoc.id : null);

            // 1. If linked to a custom RideRequest, bind directly to that request's status
            if (specificReqId) {
                const unsubReq = window.db.collection('RideRequests').doc(specificReqId).onSnapshot(async (rSnap) => {
                    if (rSnap.exists) {
                        const rData = rSnap.data();
                        const st = (rData.status || 'pending').toLowerCase();
                        if (st === 'pending' || st === 'accepted' || st === 'active') {
                            onStatusChange({ allowed: true, isPast: false, status: 'Online', bannerType: 'info', requestId: specificReqId });
                        } else {
                            onStatusChange({ allowed: false, isPast: true, status: '🔒 Trip Completed • Chat Closed (Read-Only)', bannerType: 'info' });
                        }
                    } else {
                        // Check if doc exists in legacy requests
                        try {
                            const lDoc = await window.db.collection('requests').doc(specificReqId).get();
                            if (lDoc.exists) {
                                const lData = lDoc.data();
                                const lst = (lData.status || 'pending').toLowerCase();
                                if (lst === 'pending' || lst === 'accepted' || lst === 'active') {
                                    onStatusChange({ allowed: true, isPast: false, status: 'Online', bannerType: 'info', requestId: specificReqId });
                                    return;
                                }
                            }
                        } catch (e) {}

                        // If not found as direct doc, fallback to querying passenger's active requests
                        checkActiveFallback(pId, dId, onStatusChange);
                    }
                }, () => {
                    checkActiveFallback(pId, dId, onStatusChange);
                });

                accessUnsubscribe = unsubReq;
                return;
            }

            // 2. If linked to a specific rideId (from published rides)
            if (specificRideId) {
                const unsubRide = window.db.collection('rides').doc(specificRideId).onSnapshot(async (rSnap) => {
                    if (!rSnap.exists) {
                        // Check if this was actually a RideRequest
                        checkActiveFallback(pId, dId, onStatusChange);
                        return;
                    }
                    const rData = rSnap.data();
                    const rideStatus = (rData.status || 'active').toLowerCase();

                    if (rideStatus !== 'active') {
                        onStatusChange({ allowed: false, isPast: true, status: '🔒 Trip Completed • Chat Closed (Read-Only)', bannerType: 'info' });
                        return;
                    }

                    try {
                        const bSnap = await window.db.collection('bookings')
                            .where('rideId', '==', specificRideId)
                            .where('passengerId', '==', pId)
                            .get();

                        let isCompleted = false;
                        let isUpcoming = false;
                        bSnap.forEach(doc => {
                            const st = (doc.data().status || 'upcoming').toLowerCase();
                            if (st === 'completed' || st === 'cancelled') isCompleted = true;
                            if (st === 'upcoming' || st === 'active' || st === 'in-progress') isUpcoming = true;
                        });

                        if (isUpcoming) {
                            onStatusChange({ allowed: true, isPast: false, status: 'Online', bannerType: 'info', rideId: specificRideId });
                        } else if (isCompleted) {
                            onStatusChange({ allowed: false, isPast: true, status: '🔒 Trip Completed • Chat Closed (Read-Only)', bannerType: 'info' });
                        } else {
                            onStatusChange({ allowed: true, isPast: false, status: 'Online', bannerType: 'info', rideId: specificRideId });
                        }
                    } catch (e) {
                        onStatusChange({ allowed: true, isPast: false, status: 'Online', bannerType: 'info', rideId: specificRideId });
                    }
                }, () => {
                    checkActiveFallback(pId, dId, onStatusChange);
                });

                accessUnsubscribe = unsubRide;
                return;
            }

            // 3. If linked to a specific bookingId
            if (specificBookingId) {
                const unsubBooking = window.db.collection('bookings').doc(specificBookingId).onSnapshot(bSnap => {
                    if (!bSnap.exists) {
                        checkActiveFallback(pId, dId, onStatusChange);
                        return;
                    }
                    const bData = bSnap.data();
                    const st = (bData.status || 'upcoming').toLowerCase();
                    if (st === 'upcoming' || st === 'active' || st === 'in-progress') {
                        onStatusChange({ allowed: true, isPast: false, status: 'Online', bannerType: 'info', rideId: bData.rideId });
                    } else {
                        onStatusChange({ allowed: false, isPast: true, status: '🔒 Trip Completed • Chat Closed (Read-Only)', bannerType: 'info' });
                    }
                }, () => {
                    checkActiveFallback(pId, dId, onStatusChange);
                });

                accessUnsubscribe = unsubBooking;
                return;
            }

            // 4. Fallback: Listen to both bookings and RideRequests between pId and dId
            const unsubBookings = window.db.collection('bookings')
                .where('passengerId', '==', pId)
                .where('driverId', '==', dId)
                .onSnapshot(async snap => {
                    const allBookings = [];
                    snap.forEach(doc => allBookings.push({ id: doc.id, ...doc.data() }));
                    allBookings.sort((a, b) => (b.timestamp?.toMillis ? b.timestamp.toMillis() : 0) - (a.timestamp?.toMillis ? a.timestamp.toMillis() : 0));

                    if (allBookings.length > 0) {
                        const latest = allBookings[0];
                        const st = (latest.status || 'upcoming').toLowerCase();
                        if (st === 'upcoming' || st === 'active' || st === 'in-progress') {
                            onStatusChange({ allowed: true, isPast: false, status: 'Online', bannerType: 'info', rideId: latest.rideId });
                            return;
                        }
                    }

                    checkActiveFallback(pId, dId, onStatusChange);
                }, () => {
                    checkActiveFallback(pId, dId, onStatusChange);
                });

            accessUnsubscribe = unsubBookings;
        }

        // Single-shot access check helper (per unique chat document)
        async function getChatAccessStatus(pId, dId, chatDoc = null) {
            const currentUser = getLoggedInUser();
            if (!currentUser || (currentUser.role !== 'passenger' && currentUser.role !== 'driver')) {
                return { allowed: false, isPast: true, status: '🔒 You are not authorized to chat', bannerType: 'danger' };
            }
            if (!window.db || !pId || !dId) {
                return { allowed: false, isPast: true, status: '🔒 Chat unavailable', bannerType: 'danger' };
            }

            try {
                let rideId = chatDoc?.rideId;
                const bookingId = chatDoc?.bookingId;
                const requestId = chatDoc?.requestId || (chatDoc?.id && !rideId && !bookingId ? chatDoc.id : null);

                // 1. Check direct RideRequest first if requestId or doc ID matches
                if (requestId) {
                    try {
                        const reqDoc = await window.db.collection('RideRequests').doc(requestId).get();
                        if (reqDoc.exists) {
                            const reqData = reqDoc.data();
                            const reqStatus = (reqData.status || 'pending').toLowerCase();
                            if (reqStatus === 'pending' || reqStatus === 'accepted' || reqStatus === 'active') {
                                return { allowed: true, isPast: false, status: 'Online', bannerType: 'info', requestId: requestId };
                            } else {
                                return { allowed: false, isPast: true, status: '🔒 Trip Completed • Chat Closed (Read-Only)', bannerType: 'info' };
                            }
                        }

                        const legDoc = await window.db.collection('requests').doc(requestId).get();
                        if (legDoc.exists) {
                            const legData = legDoc.data();
                            const legStatus = (legData.status || 'pending').toLowerCase();
                            if (legStatus === 'pending' || legStatus === 'accepted' || legStatus === 'active') {
                                return { allowed: true, isPast: false, status: 'Online', bannerType: 'info', requestId: requestId };
                            } else {
                                return { allowed: false, isPast: true, status: '🔒 Trip Completed • Chat Closed (Read-Only)', bannerType: 'info' };
                            }
                        }
                    } catch (e) {}
                }

                // Extract rideId from composite chatId if present (e.g. rideId_passengerId_driverId)
                if (!rideId && chatDoc?.id && chatDoc.id.includes('_')) {
                    const parts = chatDoc.id.split('_');
                    if (parts.length === 3 && parts[0] !== 'chat' && parts[0] !== 'req') {
                        rideId = parts[0];
                    }
                }

                // 2. If specific rideId exists, check that exact ride & passenger's booking status
                if (rideId) {
                    const rDoc = await window.db.collection('rides').doc(rideId).get();
                    if (rDoc.exists) {
                        const rStatus = (rDoc.data().status || 'active').toLowerCase();
                        if (rStatus === 'active') {
                            const pBookings = await window.db.collection('bookings')
                                .where('rideId', '==', rideId)
                                .where('passengerId', '==', pId)
                                .get();

                            let hasUpcoming = false;
                            let hasCompleted = false;
                            pBookings.forEach(pb => {
                                const pst = (pb.data().status || 'upcoming').toLowerCase();
                                if (pst === 'upcoming' || pst === 'active' || pst === 'in-progress') hasUpcoming = true;
                                if (pst === 'completed' || pst === 'cancelled') hasCompleted = true;
                            });

                            if (hasUpcoming) {
                                return { allowed: true, isPast: false, status: 'Online', bannerType: 'info', rideId };
                            } else if (hasCompleted) {
                                return { allowed: false, isPast: true, status: '🔒 Trip Completed • Chat Closed (Read-Only)', bannerType: 'info' };
                            } else {
                                return { allowed: true, isPast: false, status: 'Online', bannerType: 'info', rideId };
                            }
                        } else {
                            return { allowed: false, isPast: true, status: '🔒 Trip Completed • Chat Closed (Read-Only)', bannerType: 'info' };
                        }
                    }
                }

                // 3. If specific bookingId exists
                if (bookingId) {
                    const bDoc = await window.db.collection('bookings').doc(bookingId).get();
                    if (bDoc.exists) {
                        const st = (bDoc.data().status || 'upcoming').toLowerCase();
                        if (st === 'upcoming' || st === 'active' || st === 'in-progress') {
                            return { allowed: true, isPast: false, status: 'Online', bannerType: 'info', rideId: bDoc.data().rideId };
                        } else {
                            return { allowed: false, isPast: true, status: '🔒 Trip Completed • Chat Closed (Read-Only)', bannerType: 'info' };
                        }
                    }
                }

                // 4. Check active custom RideRequests between passenger & driver
                const reqSnap = await window.db.collection('RideRequests')
                    .where('passengerId', '==', pId)
                    .get();

                let activeReq = null;
                reqSnap.forEach(doc => {
                    const d = doc.data();
                    const st = (d.status || 'pending').toLowerCase();
                    if ((d.driverId === dId || !d.driverId || d.driverId === '') && (st === 'pending' || st === 'accepted' || st === 'active')) {
                        activeReq = { id: doc.id, ...d };
                    }
                });

                if (activeReq) {
                    return { allowed: true, isPast: false, status: 'Online', bannerType: 'info', requestId: activeReq.id };
                }

                // 5. Check active legacy requests
                const legSnap = await window.db.collection('requests')
                    .where('passengerId', '==', pId)
                    .get();

                let activeLeg = null;
                legSnap.forEach(doc => {
                    const d = doc.data();
                    const st = (d.status || 'pending').toLowerCase();
                    if ((d.driverId === dId || !d.driverId || d.driverId === '') && (st === 'pending' || st === 'accepted' || st === 'active')) {
                        activeLeg = { id: doc.id, ...d };
                    }
                });

                if (activeLeg) {
                    return { allowed: true, isPast: false, status: 'Online', bannerType: 'info', requestId: activeLeg.id };
                }

                // 6. Fallback: check most recent booking
                const bSnap = await window.db.collection('bookings')
                    .where('passengerId', '==', pId)
                    .where('driverId', '==', dId)
                    .get();

                const bDocs = [];
                bSnap.forEach(doc => bDocs.push({ id: doc.id, ...doc.data() }));
                bDocs.sort((a, b) => (b.timestamp?.toMillis ? b.timestamp.toMillis() : 0) - (a.timestamp?.toMillis ? a.timestamp.toMillis() : 0));

                if (bDocs.length > 0) {
                    const latest = bDocs[0];
                    const st = (latest.status || 'upcoming').toLowerCase();
                    if (st === 'upcoming' || st === 'active' || st === 'in-progress') {
                        return { allowed: true, isPast: false, status: 'Online', bannerType: 'info', rideId: latest.rideId };
                    }
                }

                return { allowed: false, isPast: true, status: '🔒 Trip Completed - Chat Closed (Read-Only)', bannerType: 'info' };
            } catch (e) {
                console.warn("Access error:", e);
            }

            return { allowed: false, isPast: true, status: '🔒 Trip Completed - Chat Closed (Read-Only)', bannerType: 'info' };
        }

        function showThreadView(chatId, otherUserName, otherUserId, explicitOtherRole, specificChatDoc = null) {
            const currentUser = getLoggedInUser();
            if (!currentUser) return;
            const isDriver = currentUser.role === 'driver';
            const otherRole = explicitOtherRole || (isDriver ? 'passenger' : 'driver');

            currentChatId = chatId;
            currentOtherUserId = otherUserId;
            currentOtherUserName = otherUserName || (otherRole === 'driver' ? 'Driver' : 'Passenger');
            currentOtherUserRole = otherRole;

            threadUserName.textContent = currentOtherUserName;
            threadRoleBadge.textContent = otherRole.toUpperCase();
            threadRoleBadge.className = `thread-role-badge ${otherRole}`;

            listView.style.display = 'none';
            threadView.style.display = 'flex';
            messagesContainer.innerHTML = '<div style="text-align:center; padding:15px; color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Loading conversation...</div>';

            const pId = isDriver ? otherUserId : currentUser.uid;
            const dId = isDriver ? currentUser.uid : otherUserId;

            // Default locked until listener validates
            if (msgInput) {
                msgInput.disabled = true;
                msgInput.placeholder = "Verifying ride status...";
            }
            if (sendBtn) {
                sendBtn.disabled = true;
                sendBtn.style.opacity = '0.4';
                sendBtn.style.cursor = 'not-allowed';
            }

            // Real-time Access Control Binding for this UNIQUE chat/ride
            bindChatAccessControl(pId, dId, (access) => {
                if (!access.allowed) {
                    if (msgInput) {
                        msgInput.disabled = true;
                        msgInput.placeholder = "🔒 Trip Completed - Chat Closed (Read-Only)";
                        msgInput.style.background = "#f1f5f9";
                        msgInput.style.color = "#94a3b8";
                        msgInput.style.cursor = "not-allowed";
                    }
                    if (sendBtn) {
                        sendBtn.disabled = true;
                        sendBtn.style.opacity = '0.35';
                        sendBtn.style.cursor = 'not-allowed';
                    }
                    if (accessBanner && bannerText) {
                        accessBanner.className = "chat-access-banner info";
                        bannerText.innerHTML = '<i class="fa-solid fa-lock" style="margin-right:6px;"></i> Trip Completed • Chat is closed for new messages (History viewable)';
                        accessBanner.style.display = 'flex';
                    }
                    if (threadUserStatus && threadStatusText) {
                        threadUserStatus.className = 'thread-status disabled-state';
                        threadStatusText.textContent = 'Trip Completed (Read-Only)';
                    }
                } else {
                    if (msgInput) {
                        msgInput.disabled = false;
                        msgInput.placeholder = "Type a message...";
                        msgInput.style.background = "#ffffff";
                        msgInput.style.color = "#1e293b";
                        msgInput.style.cursor = "text";
                    }
                    if (sendBtn) {
                        sendBtn.disabled = false;
                        sendBtn.style.opacity = '1';
                        sendBtn.style.cursor = 'pointer';
                    }
                    if (accessBanner) {
                        accessBanner.style.display = 'none';
                    }
                    if (threadUserStatus && threadStatusText) {
                        threadUserStatus.className = 'thread-status online';
                        threadStatusText.textContent = 'Online • Active Ride';
                    }
                }
            }, specificChatDoc || { id: chatId });

            // Listen to messages in this thread
            if (messagesUnsubscribe) messagesUnsubscribe();
            if (window.db) {
                messagesUnsubscribe = window.db.collection('chats').doc(chatId).collection('messages')
                    .orderBy('timestamp', 'asc')
                    .onSnapshot(snapshot => {
                        messagesContainer.innerHTML = '';
                        if (snapshot.empty) {
                            messagesContainer.innerHTML = `
                                <div style="text-align:center; color:#64748b; margin-top:40px; font-size:0.9rem;">
                                    <div style="font-size: 1.8rem; margin-bottom: 8px;">👋</div>
                                    Say hello to <strong>${currentOtherUserName}</strong> (${otherRole})!
                                </div>`;
                        } else {
                            const myUid = String(currentUser.uid || currentUser.id || '').trim();

                            snapshot.forEach(doc => {
                                const msg = doc.data();
                                const msgSenderId = String(msg.senderId || '').trim();
                                const isMine = Boolean(myUid && msgSenderId && myUid === msgSenderId);
                                const timeStr = formatTime(msg.timestamp);

                                const wrapper = document.createElement('div');
                                wrapper.className = `msg-wrapper ${isMine ? 'sent' : 'received'}`;

                                if (isMine) {
                                    wrapper.innerHTML = `
                                        <div class="msg sent">${escapeHtml(msg.text || '')}</div>
                                        ${timeStr ? `<div class="msg-time">${timeStr}</div>` : ''}
                                    `;
                                } else {
                                    const senderLabel = msg.senderName || currentOtherUserName;
                                    wrapper.innerHTML = `
                                        <div class="msg-sender-name">${escapeHtml(senderLabel)} <span style="font-weight:normal; font-size:0.7rem; color:#94a3b8;">(${otherRole})</span></div>
                                        <div class="msg received">${escapeHtml(msg.text || '')}</div>
                                        ${timeStr ? `<div class="msg-time">${timeStr}</div>` : ''}
                                    `;
                                }

                                messagesContainer.appendChild(wrapper);
                            });
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }

                        // Clear unread count for me
                        const roleKey = isDriver ? 'unread_driver' : 'unread_passenger';
                        window.db.collection('chats').doc(chatId).update({ [roleKey]: 0 }).catch(() => {});
                    }, err => {
                        console.error("Messages listener error:", err);
                    });
            }
        }

        // Global Direct Chat Opener Function
        window.openDirectChat = async function(otherUserId, otherUserName, explicitChatId) {
            const currentUser = getLoggedInUser();
            if (!currentUser || !currentUser.uid) {
                if (window.showAppAlert) window.showAppAlert({ title: "Login Required", message: "Please log in to use chat.", type: "warning" });
                return;
            }
            const isDriver = currentUser.role === 'driver';
            const otherRole = isDriver ? 'passenger' : 'driver';

            const pId = isDriver ? otherUserId : currentUser.uid;
            const dId = isDriver ? currentUser.uid : otherUserId;

            const access = await getChatAccessStatus(pId, dId, { id: explicitChatId, requestId: explicitChatId });
            if (!access.allowed) {
                if (window.showAppAlert) {
                    window.showAppAlert({ title: "Chat Access", message: access.status, type: "info" });
                }
                return;
            }

            let chatId = explicitChatId || `chat_${pId}_${dId}`;
            if (window.db) {
                await window.db.collection('chats').doc(chatId).set({
                    chatId: chatId,
                    participants: [pId, dId],
                    passengerId: pId,
                    passengerName: isDriver ? otherUserName : (currentUser.name || 'Passenger'),
                    driverId: dId,
                    driverName: isDriver ? (currentUser.name || 'Driver') : otherUserName,
                    rideId: access.rideId || null,
                    lastTimestamp: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true }).catch(console.error);
            }

            chatPanel.classList.add('active');
            showThreadView(chatId, otherUserName || (otherRole === 'driver' ? 'Driver' : 'Passenger'), otherUserId, otherRole, { id: chatId, requestId: access.requestId || explicitChatId, rideId: access.rideId });
        };

        // Listen for chats list
        function setupChatsListListener() {
            const currentUser = getLoggedInUser();
            if (!currentUser || !currentUser.uid || !window.db) return;
            const isDriver = currentUser.role === 'driver';
            const roleField = isDriver ? 'driverId' : 'passengerId';
            const otherRole = isDriver ? 'passenger' : 'driver';

            if (chatsUnsubscribe) chatsUnsubscribe();

            chatsUnsubscribe = window.db.collection('chats')
                .where(roleField, '==', currentUser.uid)
                .onSnapshot(async snapshot => {
                    listView.innerHTML = '';
                    let totalUnread = 0;
                    const rawChats = [];

                    snapshot.forEach(doc => {
                        rawChats.push({ id: doc.id, ...doc.data() });
                    });

                    // Categorize chats into Active vs Past (Read-only)
                    const enrichedChats = [];
                    for (const chat of rawChats) {
                        const pId = chat.passengerId;
                        const dId = chat.driverId;
                        if (pId && dId) {
                            const acc = await getChatAccessStatus(pId, dId, chat);
                            enrichedChats.push({
                                ...chat,
                                isAllowed: acc.allowed,
                                isPast: !acc.allowed
                            });
                        }
                    }

                    // Sort: Active rides first, then by latest timestamp
                    enrichedChats.sort((a, b) => {
                        if (a.isAllowed !== b.isAllowed) {
                            return a.isAllowed ? -1 : 1; // Active first
                        }
                        return (b.lastTimestamp?.toMillis() || 0) - (a.lastTimestamp?.toMillis() || 0);
                    });

                    if (enrichedChats.length === 0) {
                        if (isDriver) {
                            listView.innerHTML = `
                                <div style="padding: 40px 20px; text-align: center; color: #64748b; font-size: 0.9rem;">
                                    <div style="width: 52px; height: 52px; background: rgba(27,94,32,0.08); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto; font-size: 1.4rem; color: #1B5E20;">
                                        <i class="fa-solid fa-lock"></i>
                                    </div>
                                    <strong style="color: #1e293b; display: block; font-size: 0.95rem; margin-bottom: 6px;">No Messages Yet</strong>
                                    <span style="color: #64748b; font-size: 0.83rem; line-height: 1.4; display: block;">
                                        Active ride chats unlock automatically when passengers book your ride or you accept requests.
                                    </span>
                                </div>`;
                        } else {
                            listView.innerHTML = `
                                <div style="padding: 40px 20px; text-align: center; color: #64748b; font-size: 0.9rem;">
                                    <div style="width: 52px; height: 52px; background: rgba(27,94,32,0.08); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto; font-size: 1.4rem; color: #1B5E20;">
                                        <i class="fa-solid fa-lock"></i>
                                    </div>
                                    <strong style="color: #1e293b; display: block; font-size: 0.95rem; margin-bottom: 6px;">No Messages Yet</strong>
                                    <span style="color: #64748b; font-size: 0.83rem; line-height: 1.4; display: block; margin-bottom: 15px;">
                                        Chat unlocks automatically when a driver accepts your ride request or you book a ride.
                                    </span>
                                    <a href="/passenger-dashboard/search_rides.html" style="display: inline-block; padding: 7px 16px; background: #1B5E20; color: white; border-radius: 20px; text-decoration: none; font-size: 0.82rem; font-weight: 600;">
                                        <i class="fa-solid fa-magnifying-glass" style="margin-right: 5px;"></i> Find & Book Ride
                                    </a>
                                </div>`;
                        }
                    } else {
                        enrichedChats.forEach(chat => {
                            const otherUserName = isDriver ? (chat.passengerName || 'Passenger') : (chat.driverName || 'Driver');
                            const otherUserId = isDriver ? chat.passengerId : chat.driverId;
                            const unreadKey = isDriver ? 'unread_driver' : 'unread_passenger';
                            const unreadCount = chat[unreadKey] || 0;
                            totalUnread += unreadCount;

                            const initial = otherUserName ? otherUserName.charAt(0).toUpperCase() : '?';
                            const isActive = chat.isAllowed;

                            const item = document.createElement('div');
                            item.className = `chat-list-item ${isActive ? 'active-thread' : 'past-thread'}`;
                            item.style.opacity = isActive ? '1' : '0.85';
                            item.innerHTML = `
                                <div class="chat-avatar" style="${!isActive ? 'background:#cbd5e1; color:#475569;' : ''}">${initial}</div>
                                <div class="chat-details">
                                    <div class="chat-name" style="display:flex; justify-content:space-between; align-items:center;">
                                        <span>
                                            ${escapeHtml(otherUserName)} 
                                            <span class="thread-role-badge ${otherRole}" style="font-size:0.62rem; padding:1px 5px; margin-left:3px;">${otherRole.toUpperCase()}</span>
                                        </span>
                                        ${isActive 
                                            ? `<span class="badge" style="background: rgba(16,185,129,0.15); color: #10b981; font-size: 0.62rem; padding: 2px 6px; border-radius: 6px; font-weight: 600;"><i class="fa-solid fa-circle-dot me-1" style="font-size:0.5rem;"></i> Active Ride</span>`
                                            : `<span class="badge" style="background: rgba(100,116,139,0.12); color: #64748b; font-size: 0.62rem; padding: 2px 6px; border-radius: 6px; font-weight: 500;"><i class="fa-solid fa-lock me-1" style="font-size:0.5rem;"></i> Past Trip</span>`
                                        }
                                    </div>
                                    <div class="chat-last-msg" style="font-size:0.8rem; color:${isActive ? '#334155' : '#94a3b8'};">${escapeHtml(chat.lastMessage || (isActive ? 'Tap to open active chat' : 'Past conversation history'))}</div>
                                </div>
                                ${unreadCount > 0 ? `<div class="chat-unread-badge">${unreadCount}</div>` : ''}
                            `;

                            item.addEventListener('click', () => showThreadView(chat.id, otherUserName, otherUserId, otherRole, chat));
                            listView.appendChild(item);
                        });
                    }

                    if (unreadDot) {
                        unreadDot.style.display = totalUnread > 0 ? 'block' : 'none';
                    }
                }, error => {
                    console.error("Error listening to chats:", error);
                    listView.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b; font-size: 0.85rem;">No active messages found.</div>';
                });
        }

        // Send Message Handler
        async function sendMessage() {
            const currentUser = getLoggedInUser();
            if (!currentUser || !currentUser.uid || !window.db) return;
            const isDriver = currentUser.role === 'driver';

            const text = msgInput.value.trim();
            if (!text || !currentChatId || !currentOtherUserId) return;

            const pId = isDriver ? currentOtherUserId : currentUser.uid;
            const dId = isDriver ? currentUser.uid : currentOtherUserId;

            const access = await getChatAccessStatus(pId, dId, { id: currentChatId });
            if (!access.allowed) {
                if (window.showAppAlert) {
                    window.showAppAlert({ title: "Cannot Send Message", message: access.status, type: "warning" });
                }
                msgInput.disabled = true;
                msgInput.placeholder = access.status;
                if (sendBtn) sendBtn.disabled = true;
                return;
            }

            msgInput.value = '';

            const msgData = {
                senderId: String(currentUser.uid),
                senderName: currentUser.name || (isDriver ? 'Driver' : 'Passenger'),
                senderRole: isDriver ? 'driver' : 'passenger',
                text: text,
                read: false,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                await window.db.collection('chats').doc(currentChatId).collection('messages').add(msgData);

                const otherRoleKey = isDriver ? 'unread_passenger' : 'unread_driver';
                await window.db.collection('chats').doc(currentChatId).set({
                    chatId: currentChatId,
                    participants: [pId, dId],
                    lastMessage: text,
                    lastTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    [otherRoleKey]: firebase.firestore.FieldValue.increment(1)
                }, { merge: true });
            } catch (err) {
                console.error("Error sending message:", err);
            }
        }

        function escapeHtml(str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        if (sendBtn) sendBtn.addEventListener('click', sendMessage);
        if (msgInput) {
            msgInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') sendMessage();
            });
        }

        // Update Online Heartbeat
        function updateLastActive() {
            const currentUser = getLoggedInUser();
            if (window.db && currentUser && currentUser.uid) {
                window.db.collection('users').doc(currentUser.uid).update({
                    lastActive: Date.now()
                }).catch(() => {});
            }
        }

        updateLastActive();
        setInterval(updateLastActive, 120000);
        setupChatsListListener();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChatWidget);
    } else {
        initChatWidget();
    }
})();
