/**
 * ICBT Ride - Free OpenStreetMap & Leaflet Map Service
 * 100% Free, Open-Source (No API Key or Billing Required)
 * - Location Autocomplete with OpenStreetMap Nominatim (Sri Lanka)
 * - Route Highlighting & Distance using OSRM Public Routing
 * - Universal Interactive Route Map Modal for Driver & Passenger
 */

(function () {
    'use strict';

    // Sri Lanka Default Center & Bounds
    const SRI_LANKA_CENTER = [7.8731, 80.7718];
    const SRI_LANKA_BOUNDS = [
        [5.918, 79.652], // Southwest
        [9.835, 81.881]  // Northeast
    ];

    // Cache for geocoded queries
    const geocodeCache = new Map();

    // Comprehensive Sri Lanka Hubs & Cities Database (Full Island coverage)
    const LOCAL_HUBS = {
        // Kandy District & Matale Region
        'matale': [7.4675, 80.6234],
        'matale town': [7.4675, 80.6234],
        'ukuwela': [7.4247, 80.6276],
        'palapathwela': [7.5025, 80.6389],
        'rattota': [7.5147, 80.6811],
        'yatawatta': [7.5342, 80.5982],
        'alawatugoda': [7.3872, 80.6291],
        'akurana': [7.3625, 80.6192],
        'katugastota': [7.3275, 80.6225],
        'kandy': [7.2906, 80.6337],
        'icbt kandy': [7.2906, 80.6337],
        'peradeniya': [7.2589, 80.5969],
        'gelioya': [7.2189, 80.5847],
        'hindagala': [7.2341, 80.5992],
        'gampola': [7.1643, 80.5694],
        'nawalapitiya': [7.0494, 80.5336],
        'kundasale': [7.2833, 80.6833],
        'digana': [7.2981, 80.7383],
        'teldeniya': [7.3117, 80.7719],
        'wattegama': [7.3514, 80.6828],
        'kadugannawa': [7.2547, 80.5219],
        'pilimathalawa': [7.2625, 80.5519],
        'dambulla': [7.8742, 80.6511],
        'galewela': [7.7539, 80.5672],
        'naula': [7.7056, 80.6517],

        // Western Province (Colombo & Gampaha)
        'colombo': [6.9271, 79.8612],
        'icbt campus': [6.8649, 79.8628],
        'icbt colombo': [6.8649, 79.8628],
        'dehiwala': [6.8344, 79.8728],
        'mount lavinia': [6.8378, 79.8644],
        'ratmalana': [6.8194, 79.8828],
        'moratuwa': [6.7730, 79.8816],
        'panadura': [6.7130, 79.9074],
        'wadduwa': [6.6667, 79.9333],
        'kalutara': [6.5854, 79.9607],
        'beruwala': [6.4789, 79.9828],
        'aluthgama': [6.4333, 80.0000],
        'nugegoda': [6.8649, 79.8997],
        'maharagama': [6.8480, 79.9266],
        'pannipitiya': [6.8453, 79.9547],
        'kottawa': [6.8428, 79.9653],
        'homagama': [6.8422, 80.0033],
        'godagama': [6.8458, 80.0347],
        'meegoda': [6.8486, 80.0639],
        'hanwella': [6.9000, 80.0833],
        'avissawella': [6.9536, 80.2078],
        'rajagiriya': [6.9094, 79.8953],
        'battaramulla': [6.8998, 79.9197],
        'pelawatte': [6.8917, 79.9278],
        'thalawathugoda': [6.8778, 79.9375],
        'malabe': [6.9042, 79.9548],
        'kaduwela': [6.9333, 79.9833],
        'peliyagoda': [6.9694, 79.8833],
        'kelaniya': [6.9553, 79.9152],
        'kiribathgoda': [6.9806, 79.9306],
        'mahara': [6.9944, 79.9472],
        'kadawatha': [7.0016, 79.9542],
        'gampaha': [7.0840, 79.9943],
        'yakkala': [7.0889, 80.0333],
        'nittambuwa': [7.1444, 80.1000],
        'warakapola': [7.2247, 80.1983],
        'wattala': [6.9889, 79.8917],
        'kandana': [7.0472, 79.8972],
        'ja-ela': [7.0750, 79.8917],
        'seeduwa': [7.1250, 79.8750],
        'katunayake': [7.1694, 79.8903],
        'negombo': [7.2008, 79.8736],

        // Sabaragamuwa & Central Highway
        'kegalle': [7.2514, 80.3464],
        'mawanella': [7.2528, 80.4472],
        'ratnapura': [6.6828, 80.4000],
        'nuwara eliya': [6.9497, 80.7891],
        'hatton': [6.8956, 80.5967],

        // North Western
        'kurunegala': [7.4863, 80.3623],
        'icbt kurunegala': [7.4863, 80.3623],
        'mawathagama': [7.4333, 80.4333],
        'polgahawela': [7.3333, 80.3000],
        'kuliyapitiya': [7.4689, 80.0447],
        'chilaw': [7.5758, 79.7953],

        // Southern Province
        'galle': [6.0535, 80.2210],
        'hikkaduwa': [6.1394, 80.1061],
        'ambalangoda': [6.2356, 80.0544],
        'bentota': [6.4258, 79.9972],
        'matara': [5.9549, 80.5550],
        'weligama': [5.9750, 80.4286],
        'tangalle': [6.0242, 80.7942],

        // Northern & Eastern
        'anuradhapura': [8.3114, 80.4037],
        'polonnaruwa': [7.9403, 81.0188],
        'trincomalee': [8.5874, 81.2152],
        'batticaloa': [7.7102, 81.6924],
        'jaffna': [9.6615, 80.0255],
        'badulla': [6.9934, 81.0550],
        'bandarawela': [6.8259, 80.9982],
        'ella': [6.8667, 81.0467]
    };

    let activeMapInstance = null;
    let activeRouteLayer = null;
    let activeStartMarker = null;
    let activeDestMarker = null;

    /**
     * Search places in Sri Lanka using comprehensive local DB + OSM Nominatim API
     */
    async function searchLocationsSriLanka(query) {
        if (!query || query.trim().length < 1) return [];
        const cleanQuery = query.trim().toLowerCase();

        // 1. Instant local matching (Zero Network Latency)
        const localMatches = [];
        for (const [key, coords] of Object.entries(LOCAL_HUBS)) {
            if (key.startsWith(cleanQuery) || key.includes(cleanQuery) || cleanQuery.includes(key)) {
                const formattedName = key.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                localMatches.push({
                    displayName: formattedName + ', Sri Lanka',
                    shortName: formattedName,
                    lat: coords[0],
                    lon: coords[1],
                    isLocalHub: true
                });
            }
        }

        // Sort exact start matches first
        localMatches.sort((a, b) => {
            const aStarts = a.shortName.toLowerCase().startsWith(cleanQuery);
            const bStarts = b.shortName.toLowerCase().startsWith(cleanQuery);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return a.shortName.length - b.shortName.length;
        });

        // 2. Fetch live OSM Nominatim in parallel if needed
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&countrycodes=lk&limit=8&addressdetails=1`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s timeout
            
            const res = await fetch(url, {
                headers: { 'Accept-Language': 'en' },
                signal: controller.signal
            }).catch(() => null);
            clearTimeout(timeoutId);

            if (res && res.ok) {
                const data = await res.json();
                const results = data.map(item => ({
                    displayName: item.display_name,
                    shortName: item.display_name.split(',')[0].trim(),
                    lat: parseFloat(item.lat),
                    lon: parseFloat(item.lon)
                }));

                // Merge unique items
                const combined = [...localMatches];
                results.forEach(r => {
                    const alreadyExists = combined.some(c => 
                        c.shortName.toLowerCase() === r.shortName.toLowerCase() || 
                        (Math.abs(c.lat - r.lat) < 0.005 && Math.abs(c.lon - r.lon) < 0.005)
                    );
                    if (!alreadyExists) {
                        combined.push(r);
                    }
                });
                return combined.slice(0, 10);
            }
        } catch (err) {
            // fallback gracefully
        }

        return localMatches.slice(0, 10);
    }

    /**
     * Geocode a location text to [lat, lng]
     */
    async function geocodeLocation(locationName) {
        if (!locationName) return null;
        const norm = locationName.trim().toLowerCase();

        // Check local known hubs first
        for (const [key, coords] of Object.entries(LOCAL_HUBS)) {
            if (norm.includes(key) || key.includes(norm)) {
                return coords;
            }
        }

        if (geocodeCache.has(norm)) {
            return geocodeCache.get(norm);
        }

        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName + ', Sri Lanka')}&countrycodes=lk&limit=1`;
            const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
            if (!res.ok) throw new Error('Geocoding network error');
            const data = await res.json();
            if (data && data.length > 0) {
                const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
                geocodeCache.set(norm, coords);
                return coords;
            }
        } catch (err) {
            console.warn('[MapService] Geocoding API failed for:', locationName, err);
        }

        // Default to Colombo center if not found
        return [6.9271, 79.8612];
    }

    /**
     * Fetch road route between two points using free OSRM Routing Engine
     */
    async function fetchRoadRoute(startCoords, destCoords) {
        try {
            const [lat1, lon1] = startCoords;
            const [lat2, lon2] = destCoords;
            const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('OSRM routing request failed');
            const data = await res.json();

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // GeoJSON is [lon, lat] -> Leaflet is [lat, lon]
                const distanceKm = (route.distance / 1000).toFixed(1);
                const durationMins = Math.round(route.duration / 60);

                return {
                    coordinates,
                    distanceKm: parseFloat(distanceKm),
                    durationMins
                };
            }
        } catch (err) {
            console.warn('[MapService] OSRM Route fetch failed, using straight-line fallback:', err);
        }

        // Fallback straight line
        const dLat = (destCoords[0] - startCoords[0]) * 111;
        const dLon = (destCoords[1] - startCoords[1]) * 111;
        const approxDist = Math.sqrt(dLat * dLat + dLon * dLon).toFixed(1);

        return {
            coordinates: [startCoords, destCoords],
            distanceKm: parseFloat(approxDist),
            durationMins: Math.round(approxDist * 2.2)
        };
    }

    /**
     * Attach Location Autocomplete to an HTML Input Element
     */
    function attachLocationAutocomplete(inputElementOrId, onSelectCallback) {
        const input = typeof inputElementOrId === 'string' ? document.getElementById(inputElementOrId) : inputElementOrId;
        if (!input || input.dataset.hasMapAutocomplete === 'true') return;

        input.dataset.hasMapAutocomplete = 'true';
        input.setAttribute('autocomplete', 'off');

        // Wrap input or ensure relative container
        const parent = input.parentElement;
        if (parent && getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
        }

        // Dropdown element
        const dropdown = document.createElement('div');
        dropdown.className = 'icbt-location-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: #ffffff;
            border: 1px solid rgba(0,0,0,0.12);
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            max-height: 220px;
            overflow-y: auto;
            z-index: 10500;
            display: none;
            margin-top: 4px;
            font-size: 0.85rem;
            text-align: left;
        `;
        parent.appendChild(dropdown);

        let debounceTimer = null;

        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const val = input.value.trim();
            if (val.length < 2) {
                dropdown.style.display = 'none';
                dropdown.innerHTML = '';
                return;
            }

            debounceTimer = setTimeout(async () => {
                dropdown.innerHTML = '<div style="padding: 10px 14px; color: #888;"><i class="fa-solid fa-spinner fa-spin me-2"></i>Searching Sri Lanka places...</div>';
                dropdown.style.display = 'block';

                const results = await searchLocationsSriLanka(val);
                if (!results || results.length === 0) {
                    dropdown.innerHTML = '<div style="padding: 10px 14px; color: #888;">No exact match. You can type custom place.</div>';
                    return;
                }

                dropdown.innerHTML = results.map(r => `
                    <div class="loc-item" style="padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; gap: 10px; transition: background 0.15s;">
                        <i class="fa-solid fa-location-dot" style="color: #1B5E20; font-size: 1rem;"></i>
                        <div>
                            <div style="font-weight: 600; color: #222;">${escapeHtml(r.displayName.split(',')[0])}</div>
                            <div style="font-size: 0.75rem; color: #777; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 260px;">${escapeHtml(r.displayName)}</div>
                        </div>
                    </div>
                `).join('');

                // Click handlers
                dropdown.querySelectorAll('.loc-item').forEach((el, idx) => {
                    el.addEventListener('mouseenter', () => el.style.background = 'rgba(27,94,32,0.08)');
                    el.addEventListener('mouseleave', () => el.style.background = 'transparent');
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const selected = results[idx];
                        const shortName = selected.displayName.split(',')[0].trim();
                        input.value = shortName;
                        dropdown.style.display = 'none';
                        if (typeof onSelectCallback === 'function') {
                            onSelectCallback(selected);
                        }
                    });
                });
            }, 300);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/[&<>"']/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    }

    /**
     * Create or retrieve the Route Map Modal
     */
    function ensureRouteMapModal() {
        let modal = document.getElementById('routeMapModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'routeMapModal';
            modal.style.cssText = `
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.65);
                backdrop-filter: blur(8px);
                z-index: 99990;
                align-items: center;
                justify-content: center;
                padding: 15px;
            `;

            modal.innerHTML = `
                <div style="background: #ffffff; width: 100%; max-width: 820px; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.3); display: flex; flex-direction: column; max-height: 92vh; position: relative;">
                    
                    <!-- Modal Header -->
                    <div style="padding: 16px 22px; background: #ffffff; border-bottom: 1px solid rgba(0,0,0,0.08); display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(27,94,32,0.1); color: #1B5E20; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
                                <i class="fa-solid fa-map-location-dot"></i>
                            </div>
                            <div>
                                <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: #1e293b;">Ride Route Map</h3>
                                <div style="font-size: 0.78rem; color: #64748b;">OpenStreetMap &bull; Sri Lanka Live Route</div>
                            </div>
                        </div>
                        <button id="closeRouteMapModalBtn" style="background: rgba(0,0,0,0.05); border: none; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; cursor: pointer; color: #64748b; transition: all 0.2s;">&times;</button>
                    </div>

                    <!-- Route Details Banner -->
                    <div style="background: #F9FBF9; padding: 12px 20px; border-bottom: 1px solid rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 0.92rem; font-weight: 600; color: #0f172a;">
                            <span style="display: inline-flex; align-items: center; gap: 6px; background: rgba(16,185,129,0.12); color: #10b981; padding: 3px 10px; border-radius: 12px; font-size: 0.8rem;">
                                <i class="fa-solid fa-circle-dot" style="font-size: 0.6rem;"></i> <span id="mapStartLabel">Origin</span>
                            </span>
                            <i class="fa-solid fa-arrow-right" style="color: #1B5E20; font-size: 0.8rem;"></i>
                            <span style="display: inline-flex; align-items: center; gap: 6px; background: rgba(239,68,68,0.12); color: #ef4444; padding: 3px 10px; border-radius: 12px; font-size: 0.8rem;">
                                <i class="fa-solid fa-location-pin" style="font-size: 0.75rem;"></i> <span id="mapDestLabel">Destination</span>
                            </span>
                        </div>
                        <div style="display: flex; gap: 14px; font-size: 0.85rem; color: #475569;">
                            <div><i class="fa-solid fa-route me-1" style="color: #1B5E20;"></i> Road Dist: <strong id="mapDistVal">-- km</strong></div>
                            <div><i class="fa-solid fa-clock me-1" style="color: #f59e0b;"></i> Approx: <strong id="mapDurationVal">-- mins</strong></div>
                        </div>
                    </div>

                    <!-- Map Canvas -->
                    <div id="icbtLeafletMapContainer" style="width: 100%; height: 420px; background: #e2e8f0; position: relative;">
                        <div id="mapLoadingOverlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 1000; font-size: 0.9rem; color: #1B5E20; font-weight: 600;">
                            <i class="fa-solid fa-spinner fa-spin fa-2x mb-2"></i>
                            Calculating Sri Lanka road route...
                        </div>
                    </div>

                    <!-- Modal Footer -->
                    <div style="padding: 12px 20px; background: #ffffff; border-top: 1px solid rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: #64748b;">
                        <div><i class="fa-solid fa-shield-halved text-success me-1"></i> Campus verified vehicle route</div>
                        <button id="closeRouteMapBottomBtn" style="padding: 8px 20px; background: #1B5E20; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer;">Close Map</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const closeModal = () => {
                modal.style.display = 'none';
            };

            modal.querySelector('#closeRouteMapModalBtn').addEventListener('click', closeModal);
            modal.querySelector('#closeRouteMapBottomBtn').addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
        }
        return modal;
    }

    /**
     * Show Interactive Leaflet Route Map Modal
     */
    async function showRideRouteMap(startLocation, destLocation, rideDetails = {}) {
        if (typeof L === 'undefined') {
            console.error('[MapService] Leaflet library is not loaded.');
            alert('Map library is loading, please try again in a moment.');
            return;
        }

        const modal = ensureRouteMapModal();
        modal.style.display = 'flex';

        const mapStartLabel = modal.querySelector('#mapStartLabel');
        const mapDestLabel = modal.querySelector('#mapDestLabel');
        const mapDistVal = modal.querySelector('#mapDistVal');
        const mapDurationVal = modal.querySelector('#mapDurationVal');
        const loadingOverlay = modal.querySelector('#mapLoadingOverlay');

        mapStartLabel.innerText = startLocation || 'Origin';
        mapDestLabel.innerText = destLocation || 'Destination';
        loadingOverlay.style.display = 'flex';

        // Initialize or recycle Leaflet Map
        const mapContainer = document.getElementById('icbtLeafletMapContainer');
        if (!activeMapInstance) {
            activeMapInstance = L.map('icbtLeafletMapContainer', {
                center: SRI_LANKA_CENTER,
                zoom: 8,
                zoomControl: true
            });

            // OpenStreetMap Standard Tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(activeMapInstance);
        }

        // Invalidate map size to prevent gray tiles on modal open
        setTimeout(() => {
            if (activeMapInstance) activeMapInstance.invalidateSize();
        }, 150);

        try {
            // Geocode start & destination
            const [startCoords, destCoords] = await Promise.all([
                geocodeLocation(startLocation || 'Kandy'),
                geocodeLocation(destLocation || 'Colombo')
            ]);

            // Clear previous markers and route
            if (activeStartMarker) activeMapInstance.removeLayer(activeStartMarker);
            if (activeDestMarker) activeMapInstance.removeLayer(activeDestMarker);
            if (activeRouteLayer) activeMapInstance.removeLayer(activeRouteLayer);

            // Custom Green & Red Icons
            const startIcon = L.divIcon({
                className: 'custom-map-pin start-pin',
                html: `<div style="background:#10b981; color:white; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 10px rgba(0,0,0,0.3); border:2px solid white; font-weight:bold; font-size:14px;"><i class="fa-solid fa-car-side"></i></div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            const destIcon = L.divIcon({
                className: 'custom-map-pin dest-pin',
                html: `<div style="background:#ef4444; color:white; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 10px rgba(0,0,0,0.3); border:2px solid white; font-weight:bold; font-size:14px;"><i class="fa-solid fa-flag-checkered"></i></div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            activeStartMarker = L.marker(startCoords, { icon: startIcon }).addTo(activeMapInstance)
                .bindPopup(`<strong>Start:</strong> ${escapeHtml(startLocation)}`)
                .openPopup();

            activeDestMarker = L.marker(destCoords, { icon: destIcon }).addTo(activeMapInstance)
                .bindPopup(`<strong>Destination:</strong> ${escapeHtml(destLocation)}`);

            // Fetch Real Highway/Road Route via OSRM
            const routeData = await fetchRoadRoute(startCoords, destCoords);

            // Draw Blue Path
            activeRouteLayer = L.polyline(routeData.coordinates, {
                color: '#1B5E20',
                weight: 5,
                opacity: 0.85,
                lineJoin: 'round'
            }).addTo(activeMapInstance);

            // Fit Map View to show whole route
            const bounds = L.latLngBounds([startCoords, destCoords]);
            activeMapInstance.fitBounds(bounds, { padding: [50, 50] });

            // Update stats
            mapDistVal.innerText = `${routeData.distanceKm} km`;
            mapDurationVal.innerText = `${routeData.durationMins} mins`;
        } catch (err) {
            console.error('[MapService] Failed to render map route:', err);
        } finally {
            loadingOverlay.style.display = 'none';
        }
    }

    // Known Route Corridors & Waypoints for Intermediate Matching
    const SRI_LANKA_ROUTE_CORRIDORS = [
        // Gampola - Kandy Corridor
        ['gampola', 'gelioya', 'hindagala', 'peradeniya', 'katugastota', 'kandy', 'icbt kandy'],
        // Colombo - Kandy Corridor (A1 Highway)
        ['colombo', 'icbt colombo', 'icbt campus', 'peliyagoda', 'kelaniya', 'kiribathgoda', 'mahara', 'kadawatha', 'nittambuwa', 'warakapola', 'kegalle', 'mawanella', 'kadugannawa', 'peradeniya', 'kandy', 'icbt kandy'],
        // Colombo - Galle / Matara Corridor (Galle Road / Coastal)
        ['colombo', 'icbt campus', 'wellawatte', 'dehiwala', 'mount lavinia', 'ratmalana', 'moratuwa', 'panadura', 'wadduwa', 'kalutara', 'beruwala', 'aluthgama', 'bentota', 'ambalangoda', 'hikkaduwa', 'galle', 'matara'],
        // Colombo - Negombo Corridor (A3 Highway)
        ['colombo', 'icbt campus', 'peliyagoda', 'wattala', 'mabola', 'kandana', 'ja-ela', 'seeduwa', 'katunayake', 'negombo'],
        // Colombo - Highlevel Road Corridor
        ['colombo', 'icbt campus', 'kirulapone', 'nugegoda', 'navinna', 'maharagama', 'pannipitiya', 'kottawa', 'homagama', 'godagama', 'meegoda', 'hanwella', 'avissawella'],
        // Colombo - Malabe / Kaduwela (New Kandy Rd)
        ['colombo', 'icbt campus', 'borella', 'rajagiriya', 'battaramulla', 'pelawatte', 'thalawathugoda', 'malabe', 'kaduwela'],
        // Kurunegala - Kandy Corridor
        ['kurunegala', 'icbt kurunegala', 'mallawapitiya', 'mawathagama', 'galagedara', 'katugastota', 'kandy', 'icbt kandy'],
        // Kurunegala - Colombo Corridor
        ['kurunegala', 'icbt kurunegala', 'polgahawela', 'alawwa', 'ambepussa', 'warakapola', 'nittambuwa', 'kadawatha', 'colombo', 'icbt campus'],
        // Kandy - Matale Corridor
        ['matale', 'matale town', 'ukuwela', 'palapathwela', 'rattota', 'alawatugoda', 'akurana', 'katugastota', 'kandy', 'icbt kandy', 'peradeniya', 'gelioya', 'gampola'],
        // Matale - Dambulla Corridor
        ['matale', 'matale town', 'palapathwela', 'naula', 'galewela', 'dambulla'],
        // Kandy - Digana / Teldeniya Corridor
        ['kandy', 'icbt kandy', 'kundasale', 'digana', 'teldeniya']
    ];

    /**
     * Smart Route Corridor Matching
     * Returns true if search pickup and dropoff lie along the driver's route!
     */
    function isRouteMatching(rideStart, rideDest, searchFrom, searchTo) {
        const rStart = (rideStart || '').toLowerCase().trim();
        const rDest = (rideDest || '').toLowerCase().trim();
        const sFrom = (searchFrom || '').toLowerCase().trim();
        const sTo = (searchTo || '').toLowerCase().trim();

        // 1. If no search criteria, matches all
        if (!sFrom && !sTo) {
            return { isMatch: true, type: 'all' };
        }

        // 2. Direct Substring Match
        const startMatched = !sFrom || rStart.includes(sFrom) || sFrom.includes(rStart);
        const destMatched = !sTo || rDest.includes(sTo) || sTo.includes(rDest);

        if (startMatched && destMatched) {
            return { isMatch: true, type: 'direct', label: 'Direct Route Match' };
        }

        // 3. Smart Corridor / Intermediate Waypoint Matching
        for (const corridor of SRI_LANKA_ROUTE_CORRIDORS) {
            const idxRideStart = corridor.findIndex(stop => rStart.includes(stop) || stop.includes(rStart));
            const idxRideDest = corridor.findIndex(stop => rDest.includes(stop) || stop.includes(rDest));

            if (idxRideStart !== -1 && idxRideDest !== -1 && idxRideStart !== idxRideDest) {
                const isForward = idxRideStart < idxRideDest;

                let idxSearchFrom = sFrom ? corridor.findIndex(stop => sFrom.includes(stop) || stop.includes(sFrom)) : (isForward ? idxRideStart : idxRideDest);
                let idxSearchTo = sTo ? corridor.findIndex(stop => sTo.includes(stop) || stop.includes(sTo)) : (isForward ? idxRideDest : idxRideStart);

                if (idxSearchFrom !== -1 && idxSearchTo !== -1) {
                    if (isForward) {
                        // Forward trip (e.g. Gampola [0] -> Kandy [5])
                        // Passenger joins at Peradeniya [3] -> Kandy [5]
                        if (idxRideStart <= idxSearchFrom && idxSearchFrom < idxSearchTo && idxSearchTo <= idxRideDest) {
                            const pFrom = corridor[idxSearchFrom];
                            const pTo = corridor[idxSearchTo];
                            const capitalizedFrom = pFrom.charAt(0).toUpperCase() + pFrom.slice(1);
                            const capitalizedTo = pTo.charAt(0).toUpperCase() + pTo.slice(1);
                            return {
                                isMatch: true,
                                isCorridorMatch: true,
                                type: 'corridor',
                                label: `Route Match (Passes ${capitalizedFrom} → ${capitalizedTo})`,
                                pickupStop: capitalizedFrom,
                                dropoffStop: capitalizedTo
                            };
                        }
                    } else {
                        // Reverse trip (e.g. Kandy [5] -> Gampola [0])
                        if (idxRideStart >= idxSearchFrom && idxSearchFrom > idxSearchTo && idxSearchTo >= idxRideDest) {
                            const pFrom = corridor[idxSearchFrom];
                            const pTo = corridor[idxSearchTo];
                            const capitalizedFrom = pFrom.charAt(0).toUpperCase() + pFrom.slice(1);
                            const capitalizedTo = pTo.charAt(0).toUpperCase() + pTo.slice(1);
                            return {
                                isMatch: true,
                                isCorridorMatch: true,
                                type: 'corridor',
                                label: `Route Match (Passes ${capitalizedFrom} → ${capitalizedTo})`,
                                pickupStop: capitalizedFrom,
                                dropoffStop: capitalizedTo
                            };
                        }
                    }
                }
            }
        }

        // 4. Partial match (if passenger only searched origin or only destination)
        if (sFrom && !sTo && (rStart.includes(sFrom) || sFrom.includes(rStart))) {
            return { isMatch: true, type: 'pickup_match', label: 'Origin Match' };
        }
        if (!sFrom && sTo && (rDest.includes(sTo) || sTo.includes(rDest))) {
            return { isMatch: true, type: 'dropoff_match', label: 'Destination Match' };
        }

        return { isMatch: false };
    }

    // Auto-bind autocomplete to standard input IDs across dashboards when DOM is ready
    function initAutoBind() {
        const commonInputIds = [
            'offerStart', 'offerDest',
            'dashFromInput', 'dashToInput',
            'fromInput', 'toInput',
            'reqOrigin', 'reqDestination',
            'dashReqOrigin', 'dashReqDest'
        ];

        commonInputIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) attachLocationAutocomplete(el);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAutoBind);
    } else {
        initAutoBind();
    }

    // Expose Global Map Service API
    window.MapService = {
        attachLocationAutocomplete,
        showRideRouteMap,
        geocodeLocation,
        searchLocationsSriLanka,
        fetchRoadRoute,
        isRouteMatching,
        SRI_LANKA_ROUTE_CORRIDORS
    };

    window.showRideRouteMap = showRideRouteMap;

})();
