# EdTech LMS Platform

A full-stack, enterprise-grade Learning Management System (LMS) designed for schools and universities. The platform integrates a cross-platform React Native mobile application for teachers/students, a dedicated React-based admin dashboard, a hybrid microservice backend, and real-time synchronization services.

---

## Project Overview

The EdTech LMS Platform features:
* **Mobile Client**: A cross-platform **React Native / Expo** application utilizing Expo Router for file-system-based path resolution. Supports separate dashboard interfaces for Teachers, Students, and Admins.
* **Admin Dashboard**: A React.js Single Page Application (SPA) facilitating full user lifecycle management, audit trail inspection, and environment status tracking.
* **Gateway Tier**: An **Nginx Reverse Proxy** acting as a unified API entry point routing traffic based on path rules.
* **Auth Service**: Express.js microservice managing identity operations, JWT generation, and integrating with **AWS Cognito** (locally emulated via LocalStack).
* **Core API Service**: Express.js MVC backend implementing the primary domain logics, including assignments, topics, material uploads, attendance logs, grading, and in-app communications.
* **Background Worker**: Node.js service utilizing **BullMQ** to process nightly performance analytics and trigger critical grade-drop alerts.
* **Notification Service**: A dedicated service consuming gRPC payloads and sending push notifications to devices via **Firebase Cloud Messaging (FCM)**.
* **AWS Emulation**: **LocalStack** providing local instances of AWS Cognito (User Pools) and AWS S3 (student file submissions, learning materials, and avatars).
* **Database split**: MongoDB acts as the primary document store for high-frequency classroom feeds and student profile collections. PostgreSQL serves as the relational engine (with Prisma) for administrative logs and referential constraint checks.

---

## Directory Structure

The project follows a monorepo structure separating frontend applications, backend microservices, shared protobuf declarations, and configuration settings:

```
.
├── apps/
│   ├── admin-web/               # React.js SPA Web Admin Panel
│   │   ├── src/                 # Application sources
│   │   ├── package.json         # Dependencies
│   │   └── Dockerfile           # Web server containerization
│   └── mobile-app/              # React Native / Expo Mobile Application
│       ├── app/                 # Expo Router file-based screens
│       ├── components/          # Reusable native UI components
│       ├── package.json         # Expo native dependencies
│       └── app.json             # Expo App configuration
├── docs/                        # Architectural & API Design Documentation
│   ├── api_design.md            # REST, Sockets, and gRPC contracts
│   └── architecture.md          # Architectural diagram and data flows
├── infra/                       # Infra configuration templates
│   └── nginx/
│       └── default.conf         # Nginx reverse proxy routes
├── proto/                       # Shared gRPC Protocol Buffer contracts
│   ├── auth.proto               # Authentication service types and methods
│   └── notification.proto       # Streaming push notification contract
├── services/                    # Backend microservices
│   ├── auth-service/            # Auth microservice (Port 3001)
│   │   ├── src/                 # Controllers, gRPC server, and Cognito SDK
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── core-api/                # Core API microservice (Port 3002)
│   │   ├── src/                 # Express MVC & Socket.IO server
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── notification-service/    # FCM Push Notification Service (gRPC server)
│   │   ├── src/
│   │   ├── package.json
│   │   └── Dockerfile
│   └── background-worker/       # BullMQ Job Processor
│       ├── src/                 # Recalculates metrics and alerts
│       ├── package.json
│       └── Dockerfile
├── docker-compose.yml           # Unified multi-container configuration
└── README.md                    # Project documentation
```

---

## Component Port Mappings

Below is the network topology mapping of exposed and internal ports when running the full container stack:

| Service / Container Name | Host Port | Internal Port | Protocol | Purpose / Route |
|---|---|---|---|---|
| **nginx** | `80` | `80` | HTTP | Gateway (Reverse proxies `/api/auth/*` and `/api/*`) |
| **admin-web** | `3000` | `3000` | HTTP | Admin dashboard frontend SPA |
| **auth-service** | `3001` | `3001` | HTTP / gRPC | Auth API (Internal to Nginx & gRPC client) |
| **core-api** | `3002` | `3002` | HTTP / WS | Core REST endpoints & Socket.IO WebSockets |
| **notification-svc** | `50051` | `50051` | gRPC | Handlers for incoming notification stream |
| **localstack** | `4566` | `4566` | HTTP | Emulates AWS Cognito and AWS S3 |
| **mongodb** | `27017` | `27017` | TCP | Stores Auth and Core Mongo collections |
| **postgres** | `5432` | `5432` | TCP | Relation DB for transaction logs and metrics |
| **redis** | `6379` | `6379` | TCP | Redis server for BullMQ and Socket.IO adapter |

---

## Getting Started

### Prerequisites

Ensure you have the following software installed locally:
* **Docker** & **Docker Compose**
* **Node.js** (v18+ recommended) and **npm** (for local application compilation and testing)
* **Expo Go** app (installed on a physical Android/iOS device to run the mobile app)

### Running the Application (Docker Compose)

The entire infrastructure stack (databases, proxies, cloud emulators, and backend microservices) can be bootstrapped using the unified Docker Compose configuration.

#### Step 1: Clone the repository & set environment parameters
Copy the template environment variables file for each service (or configure them globally):
```bash
# Example env setup for Core API
cp services/core-api/.env.example services/core-api/.env

# Example env setup for Auth Service
cp services/auth-service/.env.example services/auth-service/.env
```

#### Step 2: Build and start the services
Launch all containers in detached mode:
```bash
docker compose up --build -d
```
This command builds the container images (using target stages defined in their respective Dockerfiles) and coordinates startup dependency order (e.g. databases and redis start before microservices).

#### Step 3: Run Database Migrations & Initial Setup
Once database containers are fully operational, execute PostgreSQL migrations and initialize LocalStack buckets:
```bash
# Execute Prisma migrations on PostgreSQL
docker compose exec core-api npx prisma migrate deploy

# Execute Cognito user-pool creation & S3 bucket initialization script
docker compose exec localstack /usr/local/bin/init-aws.sh
```

#### Step 4: Verify Service Health
Ensure all containers are in the `running` state:
```bash
docker compose ps
```
You can view logs for a specific service using:
```bash
docker compose logs -f core-api
```

#### Step 5: Stop the application
To tear down the containers while preserving database volume data:
```bash
docker compose down
```
To purge all volumes and database states, run:
```bash
docker compose down -v
```

---

## Running the Clients Locally

### React Native Mobile App (Expo)
To launch the developer packager and test on a mobile simulator or physical device:
1. Navigate to the mobile app folder:
   ```bash
   cd apps/mobile-app
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Expo bundler:
   ```bash
   npx expo start
   ```
4. Scan the generated QR code using the **Expo Go** application on your smartphone, or press `a` for Android emulator or `i` for iOS simulator.

### Admin Web Panel (React SPA)
To start the React development server locally:
1. Navigate to the web folder:
   ```bash
   cd apps/admin-web
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Boot the application:
   ```bash
   npm run dev
   ```
4. Access the web dashboard by loading `http://localhost:3000` in your web browser.

---

## Documentation Links

For further information regarding schema design, real-time protocols, and inter-service communications, refer to:
* **System Architecture**: [docs/architecture.md](docs/architecture.md)
* **API Design & Protocols**: [docs/api_design.md](docs/api_design.md)
