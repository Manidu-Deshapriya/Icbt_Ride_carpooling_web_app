# 🚗 ICBT Ride — Campus Carpooling Web Application

![.NET 8.0](https://img.shields.io/badge/.NET-8.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%26%20Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-CI%2FCD%20Automated-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Installable%20App-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-Interactive%20Maps-199900?style=for-the-badge&logo=leaflet&logoColor=white)

> **ICBT Ride** is a sustainable, role-based university carpooling web application engineered to streamline daily campus commuting for students, drivers, and vehicle owners across Sri Lanka. Built with an optimized multi-tier architecture featuring **ASP.NET Core (.NET 8)**, **Node.js Express REST API**, **Firebase Firestore**, **Leaflet Interactive Maps**, and containerized with **Docker & Docker Compose**.

---

## ⚡ Quick Start & Installation (Run the App First)

### 🐳 Option 1: Run with Docker (Recommended — Single Command)

1. **Make sure Docker Desktop is installed and RUNNING on your computer.**

2. **Clone the Repository:**
   ```bash
   git clone https://github.com/Manidu-Deshapriya/Icbt_Ride_carpooling_web_app.git
   ```

3. **Navigate to the Project Directory & Open Terminal:**
   ```bash
   cd "Icbt_Ride_carpooling_web_app/icbt ride/icbt ride"
   ```
   *(Ensure you are in the directory containing `Dockerfile` and `docker-compose.yml`)*

4. **Build and start the container:**
   ```bash
   docker compose up -d --build
   ```

5. **Open in Web Browser:**
   * 👉 **`http://localhost:8080`** — *(Loads Main Login Screen: Passenger / Driver / Owner)*
   * 👉 **`http://localhost:8080/admin-dashboard/admin-login.html`** — *(Loads Admin Portal)*

6. **To stop the container:**
   ```bash
   docker compose down
   ```

---

### 💻 Option 2: Run with Native .NET CLI

1. **Navigate to the Project Directory:**
   ```bash
   cd "icbt ride/icbt ride"
   ```
2. **Restore & Run:**
   ```bash
   dotnet restore
   dotnet run
   ```
3. **Open in Web Browser:**
   * 👉 **`https://localhost:7120`** or **`http://localhost:5246`**

---

### 🟢 Option 3: Run Backend Node.js REST API Server

1. **Navigate to Server Directory:**
   ```bash
   cd "icbt ride/icbt ride/server"
   ```
2. **Install & Start:**
   ```bash
   npm install
   npm start
   ```
3. **API Endpoint:**
   * 👉 **`http://localhost:5000`**

---

## 🔒 Default Access & Demo Credentials

| Role / Portal | Direct Access URL | Demo Email | Password |
| :--- | :--- | :--- | :--- |
| **Main Portal Router** | `http://localhost:8080` | *(Select role tab)* | *(Select role tab)* |
| **Admin Portal** | `http://localhost:8080/admin-dashboard/admin-login.html` | `admin@icbt.lk` | `admin123` |
| **Passenger Portal** | `http://localhost:8080` *(Passenger Tab)* | `student@icbt.lk` | `student123` |
| **Driver Portal** | `http://localhost:8080` *(Driver Tab)* | `driver@icbt.lk` | `driver123` |
| **Vehicle Owner Portal** | `http://localhost:8080` *(Owner Tab)* | `owner@icbt.lk` | `owner123` |

---

## 📑 Table of Contents
- [🌟 Key Architectural Highlights](#-key-architectural-highlights)
- [👥 Portal Modules & Features](#-portal-modules--features)
  - [1. 🎒 Passenger Dashboard](#1--passenger-dashboard)
  - [2. 🚗 Driver Dashboard & Fuel Regulation](#2--driver-dashboard--fuel-regulation)
  - [3. 🏢 Vehicle Owner Fleet Dashboard](#3--vehicle-owner-fleet-dashboard)
  - [4. 🛡️ System Administration Portal](#4-️-system-administration-portal)
  - [5. ⚡ Shared Core Real-Time Services](#5--shared-core-real-time-services)
- [🛠️ Technology Stack](#️-technology-stack)
- [🔄 CI/CD Automation Pipeline](#-cicd-automation-pipeline)
- [📁 Repository Structure](#-repository-structure)
- [👥 Contributors & Team Members](#-contributors--team-members)

---

## 🌟 Key Architectural Highlights

* **Multi-Role Authentication Router**: Automatic role-based session detection routing Passengers, Drivers, Owners, and Admins to their respective dashboards.
* **National Fuel Quota & Odd-Even Engine**: Built-in regulatory compliance engine checking vehicle fuel status and license plate numbers prior to ride creation.
* **Interactive Route Mapping**: Real-time waypoint plotting, distance calculation, and visual route preview powered by Leaflet.js.
* **Automated Instant Wallet Refund**: Cancelling an active booking automatically restores seat availability and instantly credits the full ride fare back to the passenger's ICBT Digital Wallet.
* **Real-time Peer Messaging**: In-app live floating chat widget enabling direct communication between passengers and assigned drivers with trip-lifecycle access control.
* **Emergency SOS Rescue System**: Instant broadcast alert allowing stranded students/commuters to request immediate emergency rescue rides from nearby campus drivers.
* **Progressive Web App (PWA)**: Offline caching service worker and 1-click installable mobile app experience.

---

## 👥 Portal Modules & Features

### 1. 🎒 Passenger Dashboard (`wwwroot/passenger-dashboard/`)
* **Live Ride Search (`search_rides.html`)**: Search available campus rides filtered by Origin, Destination, Date, and Seats with interactive route visualization.
* **ICBT Digital Wallet & Booking (`wallet.html`)**: Instant 1-click seat reservation deducted directly from the student's digital wallet balance.
* **On-Demand Custom Requests (`request_ride.html`)**: Broadcast custom pickup/dropoff requests with distance-based dynamic pricing and a live 20-minute expiry countdown timer.
* **Active Ride Management (`passenger_dashboard.html`, `bookings.html`)**: Live tracker card displaying current ride status with 1-click cancellation and 100% automated instant wallet refund.
* **Emergency Safety (`emergency-sos-service.js`)**: Floating SOS button for immediate commuter breakdown rescue.

### 2. 🚗 Driver Dashboard & Fuel Regulation (`wwwroot/driver-dashboard/`)
* **Ride Publishing (`rides.html`)**: Create scheduled rides with route maps, pricing per seat, and stopover points.
* **Regulatory Fuel Quota Engine (`app.js`)**: Enforces national fuel quota validation and Odd-Even vehicle plate verification before rides can be accepted.
* **Custom Request Acceptance (`requests.html`)**: Review and accept real-time passenger broadcast requests within the 20-minute window.
* **Earnings & Payout Withdrawals (`withdrawals.html`)**: Real-time earnings tracker, completed trip summaries, and bank transfer withdrawal requests.

### 3. 🏢 Vehicle Owner Fleet Dashboard (`wwwroot/owner-dashboard/`)
* **Fleet Management (`vehicles.html`)**: Register vehicles, upload documents, and track National Fuel QR Quota utilization.
* **Driver Assignment (`drivers.html`)**: Assign registered campus drivers to commercial fleet vehicles.
* **Revenue Commission Engine (`earnings.html`)**: Automated 80% Driver / 20% Owner revenue commission calculations and financial audit logs.

### 4. 🛡️ System Administration Portal (`wwwroot/admin-dashboard/`)
* **User & Driver Verification (`users.html`)**: Review student IDs, driver licenses, and approve/suspend user accounts.
* **Platform Audit & Compliance (`dashboard.html`)**: Platform metrics, active trip monitoring, emergency alert logs, and system analytics.

### 5. ⚡ Shared Core Real-Time Services (`wwwroot/js/`)
* **Floating Messenger (`chat-widget.js`)**: Direct driver-passenger real-time communication with trip-state access control.
* **Interactive Mapping (`map-service.js`)**: Route drawing, coordinate geocoding, and distance matrix calculations.
* **In-App Toast Alerts (`in-app-notification-service.js`)**: Glassmorphic animated notifications with audible alerts.
* **Service Worker (`service-worker.js`)**: Asset caching and installable PWA manifest.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | Vanilla HTML5, Modern CSS3 (Glassmorphism), JavaScript (ES6 Modules) |
| **Mapping & Routing** | Leaflet.js Interactive Maps, OpenStreetMap Tiles |
| **Application Server** | ASP.NET Core (.NET 8.0 Kestrel Server) |
| **Backend REST API** | Node.js, Express.js REST API Architecture |
| **Database & Realtime** | Google Firebase Firestore & Firebase Authentication |
| **Containerization** | Docker Engine, Multi-Stage `Dockerfile`, `docker-compose.yml` |
| **CI/CD Automation** | GitHub Actions Pipeline (`.github/workflows/ci-cd.yml`) |
| **App Distribution** | Progressive Web App (PWA) with Service Worker & Web Manifest |

---

## 🔄 CI/CD Automation Pipeline

Automated continuous integration is handled through **GitHub Actions** via [`.github/workflows/ci-cd.yml`](./.github/workflows/ci-cd.yml):

* **Trigger**: Automatic on `push` or `pull_request` to the `main` branch.
* **Stage 1 (Code Verification)**: Compiles .NET 8 solution and tests dependency restore.
* **Stage 2 (Backend Validation)**: Installs Node.js dependencies and executes syntax checks on `server.js`.
* **Stage 3 (Docker Build Test)**: Builds the production Docker image to ensure container integrity before release deployment.

---

## 📁 Repository Structure

```text
├── .github/
│   └── workflows/
│       └── ci-cd.yml                   # Automated GitHub Actions CI/CD Pipeline
├── server/                             # Node.js Express REST API Backend
│   ├── config/                         # Firebase & server configurations
│   ├── middleware/                     # Auth & error handling middlewares
│   ├── routes/                         # REST API endpoints (Auth, Rides, Bookings, Fleet)
│   ├── services/                       # Business logic services
│   ├── package.json                    # Backend dependencies
│   └── server.js                       # Express server entry point
├── wwwroot/                            # Frontend Web Application & Assets
│   ├── admin-dashboard/                # Admin portal UI & management pages
│   ├── driver-dashboard/               # Driver portal UI, fuel logic & rides
│   ├── owner-dashboard/                # Vehicle owner fleet & QR management
│   ├── passenger-dashboard/            # Passenger booking, wallet & SOS UI
│   ├── main-login/                     # Multi-role login & registration router
│   ├── js/                             # Shared real-time services (Chat, Maps, Notifications, SOS)
│   ├── css/                            # Global CSS design tokens & styles
│   ├── lib/                            # Vendor libraries (Bootstrap, FontAwesome)
│   ├── index.html                      # Application root router
│   ├── manifest.webmanifest            # PWA install configuration
│   └── service-worker.js               # Offline caching & service worker
├── Dockerfile                          # Production Multi-Stage Dockerfile
├── docker-compose.yml                  # Docker Compose container orchestration
├── .dockerignore                       # Excludes build cache & temporary files
├── Program.cs                          # ASP.NET Core application entry point
├── icbt ride.csproj                    # .NET 8 Project file
└── README.md                           # Project documentation & guidelines
```

---

## 👥 Contributors & Team Members

* **Manidu Deshapriya** — *Passenger Booking Engine, Wallet Architecture & CI/CD*
* **Rashmitha** — *Driver Portal, Route Management & Fuel Regulatory Engine*
* **Bhashini** — *Vehicle Owner Fleet Management & QR Quota System*
* **Subanya** — *System Administration Portal & Core Backend Services*

---

*Developed for ICBT Campus — Final Year Carpooling Web Application Project.*
