# ICBT Ride - Carpooling Web Application REST API Backend

A production-grade RESTful API server built for the ICBT Ride Carpooling Application, supporting Sri Lanka National Fuel Quota regulations (30L/month limit, Odd-Even license plate restrictions), multi-role access control, fleet management, and real-time in-app communication.

---

## 🛠️ Technology Stack
- **Framework**: Node.js & Express.js
- **Database & Cloud**: Google Firebase Admin SDK (Cloud Firestore & Firebase Authentication)
- **Geocoding & Route Distance**: OpenStreetMap Nominatim REST API
- **Architecture**: 3-Tier Client-Server Architecture (RESTful JSON APIs + Firestore)

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure **Node.js** (v18 or higher) is installed on your system.

### 2. Installation
Open your terminal in the `server` directory and install dependencies:
```bash
cd "icbt ride/server"
npm install
```

### 3. Environment Variables
A pre-configured `.env` file is included in this directory. You can customize the settings if needed:
```ini
PORT=5000
NODE_ENV=development
FIREBASE_PROJECT_ID=icbtride
FIREBASE_STORAGE_BUCKET=icbtride.firebasestorage.app
CORS_ORIGIN=*
```

### 4. Running the REST API Server
Start the server in development mode:
```bash
npm start
```
When running, the server will output:
```
===========================================================
🚀 ICBT Ride REST API Server is LIVE on port 5000
📡 Base URL: http://localhost:5000/api
🩺 Health Check: http://localhost:5000/api/health
===========================================================
```

---

## 📚 REST API Endpoint Directory

### 1. Authentication (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user (passenger/driver/owner) |
| `POST` | `/api/auth/login` | Login user and retrieve profile data |
| `POST` | `/api/auth/logout` | Invalidate user session |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `POST` | `/api/auth/verify-token` | Verify Firebase ID Token |

### 2. Rides & Carpooling (`/api/rides`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/rides` | Get active rides (filters: `?origin=...&destination=...&date=...`) |
| `POST` | `/api/rides` | Publish ride with **Odd-Even plate check** & **Fuel Quota deduction** |
| `GET` | `/api/rides/:id` | Get ride details |
| `PUT` | `/api/rides/:id` | Update ride details / status |
| `DELETE`| `/api/rides/:id` | Cancel ride |
| `GET` | `/api/rides/driver/:driverId` | Get driver's published rides |
| `GET` | `/api/rides/passenger/:passengerId` | Get passenger's bookings |
| `POST` | `/api/rides/:id/join` | Passenger booking request |
| `POST` | `/api/rides/:id/accept` | Driver accepts passenger booking |
| `POST` | `/api/rides/:id/reject` | Driver rejects passenger booking |
| `POST` | `/api/rides/:id/complete` | Complete ride, deduct fuel quota & calculate revenue split |

### 3. Fuel Quota & Odd-Even Engine (`/api/fuel`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/fuel/odd-even/:plateNumber` | Validate if plate can travel/refuel on current calendar date |
| `POST` | `/api/fuel/validate` | Pre-flight validation for ride creation (distance vs quota) |
| `GET` | `/api/fuel/quota/:vehicleId` | Get vehicle fuel balance and alert status ($<20\%$) |
| `POST` | `/api/fuel/refuel` | Log refuel transaction with Odd-Even check and 30L cap |
| `GET` | `/api/fuel/history/:vehicleId` | Retrieve audit history of fuel logs |
| `PUT` | `/api/fuel/quota/admin/:vehicleId`| Administrator quota adjustment |

### 4. Vehicles & Fleet Management (`/api/vehicles`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/vehicles` | List all fleet vehicles (Admin) |
| `GET` | `/api/vehicles/owner/:ownerId` | List vehicles owned by specific Fleet Owner |
| `POST` | `/api/vehicles` | Add new vehicle with initial 30L quota allocation |
| `GET` | `/api/vehicles/:id` | Get single vehicle details |
| `PUT` | `/api/vehicles/:id` | Update vehicle |
| `DELETE`| `/api/vehicles/:id` | Remove vehicle from fleet |

### 5. Driver Assignments (`/api/assignments`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/assignments/owner/:ownerId` | Get driver assignments for owner fleet |
| `POST` | `/api/assignments` | Assign driver to vehicle with shift and revenue split % |
| `PUT` | `/api/assignments/:id` | Update driver assignment |
| `DELETE`| `/api/assignments/:id` | Unassign driver from vehicle |
| `GET` | `/api/assignments/driver/:driverId` | Get driver's active vehicle assignment |

### 6. In-App Chat & Messaging (`/api/chats`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/chats/:userId` | Get all active chats for user |
| `POST` | `/api/chats` | Create chat between driver and passenger |
| `GET` | `/api/chats/:chatId/messages` | Get message history for chat |
| `POST` | `/api/chats/:chatId/messages` | Send message (**Access restricted to active rides**) |
| `PUT` | `/api/chats/:chatId/read` | Mark messages as read |

### 7. Payments & Wallet (`/api/payments`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/payments` | Process payment / Wallet top-up |
| `GET` | `/api/payments/user/:userId` | Get user payment transactions |
| `GET` | `/api/payments/ride/:rideId` | Get payments for specific ride |
| `PUT` | `/api/payments/:id/status` | Update transaction status |

### 8. User Management & Admin (`/api/users` & `/api/admin`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/users` | List all users (filter by role/status) |
| `GET` | `/api/users/pending` | Get driver/owner registrations pending approval |
| `PUT` | `/api/users/:id/status` | Approve, verify, or suspend user |
| `GET` | `/api/admin/stats` | System statistics (total rides, fuel saved, revenue) |
| `GET` | `/api/admin/complaints` | Fetch passenger/driver complaints |
| `POST` | `/api/admin/complaints/:id/resolve` | Mark complaint as resolved |
| `POST` | `/api/admin/announcements` | Publish national fuel or campus travel announcement |

---

## 🧪 Testing with Postman
A complete, ready-to-import Postman Collection is included at:
`server/postman_collection.json`

1. Open **Postman**.
2. Click **Import** $\rightarrow$ select `server/postman_collection.json`.
3. Test all endpoints against `http://localhost:5000/api`.
