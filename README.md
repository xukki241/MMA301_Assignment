# EdTech LMS Platform

A full-stack, enterprise-grade Learning Management System (LMS) designed for schools and universities. The platform integrates a cross-platform React Native mobile application for teachers/students, a dedicated React-based admin dashboard, a hybrid microservice backend, and real-time synchronization services.

---

## 🏗️ Project Overview

The EdTech LMS Platform features a microservices architecture:
* **Gateway Tier (Nginx)**: An Nginx Reverse Proxy acting as a unified API entry point routing traffic based on path rules (`/api/auth/*` and `/api/*`).
* **Auth Service**: Express.js microservice managing identity operations, JWT generation, and integrating with **AWS Cognito** (locally emulated via `mock-cognito`).
* **Core API Service**: Express.js MVC backend implementing the primary domain logic (assignments, topics, material uploads, attendance logs, grading, and in-app communications).
* **Background Worker**: Node.js service utilizing **BullMQ** to process nightly performance analytics and trigger critical grade-drop alerts.
* **Notification Service**: A dedicated service consuming gRPC payloads and sending push notifications to devices via **Firebase Cloud Messaging (FCM)**.
* **Admin Dashboard**: A React.js SPA facilitating full user lifecycle management, audit trail inspection, and environment status tracking.
* **Mobile Client**: A cross-platform **React Native / Expo** application supporting interfaces for Teachers, Students, and Admins.
* **Database & Infrastructure**:
  * **MongoDB**: Primary document store for classroom feeds and student profiles.
  * **PostgreSQL**: Relational engine (with Prisma) for administrative logs and referential constraint checks.
  * **Redis**: Cache and message broker for BullMQ and Socket.IO.
  * **LocalStack**: Provides local instances of AWS S3 (student file submissions, learning materials, and avatars).
  * **Mock Cognito**: Provides local AWS Cognito User Pools emulation to bypass LocalStack Pro licensing requirements.

---

## 📂 Directory Structure

```text
.
├── apps/
│   ├── admin-web/               # React.js SPA Web Admin Panel
│   └── mobile-app/              # React Native / Expo Mobile Application
├── docs/                        # Architectural & API Design Documentation
├── infra/                       # Infra configuration templates (e.g. Nginx, LocalStack scripts)
├── proto/                       # Shared gRPC Protocol Buffer contracts
├── services/                    # Backend microservices
│   ├── auth-service/            # Auth microservice (Port 3001)
│   ├── core-api/                # Core API microservice (Port 3002)
│   ├── notification-service/    # FCM Push Notification Service (gRPC server)
│   └── background-worker/       # BullMQ Job Processor
├── docker-compose.yml           # Unified multi-container configuration
└── README.md                    # Project documentation
```

---

## 🔌 Component Port Mappings

Below is the network topology mapping of exposed and internal ports when running the full container stack via Docker Compose:

| Service / Container Name | Host Port | Internal Port | Protocol | Purpose / Route |
|---|---|---|---|---|
| **nginx** | `80` | `80` | HTTP | Gateway (Reverse proxies `/api/auth/*` and `/api/*`) |
| **admin-web** | `3000` | `3000` | HTTP | Admin dashboard frontend SPA |
| **auth-service** | `3001` | `3001` | HTTP/gRPC| Auth API (Internal to Nginx & gRPC client) |
| **core-api** | `3002` | `3002` | HTTP/WS | Core REST endpoints & Socket.IO WebSockets |
| **notification-svc** | `50051` | `50051` | gRPC | Handlers for incoming notification stream |
| **localstack** | `4566` | `4566` | HTTP | Emulates AWS S3 for uploads/materials |
| **mock-cognito** | `9229` | `9229` | HTTP | Emulates AWS Cognito (User Pools) |
| **mongodb** | `27017` | `27017` | TCP | Stores Auth and Core Mongo collections |
| **postgres** | `5432` | `5432` | TCP | Relation DB for transaction logs and metrics |
| **redis** | `6379` | `6379` | TCP | Redis server for BullMQ and Socket.IO adapter |

---

## 🚀 Super Detailed Setup & Run Guide

Follow these comprehensive steps to bootstrap the entire infrastructure stack and run the LMS project locally.

### Prerequisites

Ensure your host machine has the following software installed:
1. **Docker Desktop** (or Docker Engine + Docker Compose Plugin)
2. **Node.js** (v18.x or v20.x recommended)
3. **npm** or **yarn** (for local application compilation and testing)
4. **Expo Go** application installed on a physical Android/iOS device (for mobile app testing)

### Step 1: Environment Variables Setup

Before running the containers, ensure all microservices have their required environment configurations.

1. Navigate to the `services/core-api` directory and copy the example environment file:
   ```bash
   cp services/core-api/.env.example services/core-api/.env
   ```
2. Navigate to the `services/auth-service` directory and do the same:
   ```bash
   cp services/auth-service/.env.example services/auth-service/.env
   ```
*(Note: If the `.env.example` files do not exist, the Docker Compose file already injects the necessary default environment variables to allow the services to communicate correctly within the Docker network).*

### Step 2: Start the Docker Infrastructure

The entire infrastructure stack (databases, proxies, cloud emulators, and backend microservices) is bootstrapped using Docker Compose.

1. At the root of the project, build and launch all containers in detached mode:
   ```bash
   docker compose up --build -d
   ```
2. Wait a few moments for the containers to fully start. You can monitor the progress and check that everything is running by executing:
   ```bash
   docker compose ps
   ```
   **Expected Output**: You should see 10 containers running (`nginx`, `admin-web`, `auth-service`, `core-api`, `notification-svc`, `localstack`, `mock-cognito`, `mongodb`, `postgres`, `redis`).

### Step 3: Run Database Migrations (PostgreSQL)

Once the `postgres` container is fully operational, you must execute the Prisma migrations to generate the relational schema.

1. Run the Prisma migration deploy command inside the `core-api` container:
   ```bash
   docker compose exec core-api npx prisma migrate deploy
   ```
2. *(Optional)* If you need to seed the database with initial data, you can run the seed script (if configured):
   ```bash
   docker compose exec core-api npm run seed
   ```

### Step 4: Verify AWS Emulation (LocalStack & Cognito)

The project relies on local emulators for AWS services.
- **LocalStack (Port 4566)**: Handles AWS S3. It is configured to automatically run `/infra/localstack/init-aws.sh` on startup to create the `lms-uploads` bucket.
- **Mock Cognito (Port 9229)**: Handles AWS Cognito User Pools. We use `jagregory/cognito-local` to avoid the LocalStack Pro licensing constraint.

**To manually verify the S3 bucket exists:**
```bash
docker compose exec localstack awslocal s3 ls
```
You should see `lms-uploads` listed. If not, you can manually create it:
```bash
docker compose exec localstack awslocal s3 mb s3://lms-uploads
```

### Step 5: Verify Service Health & Logs

Ensure that the backend services have connected to their respective databases and started their servers.

- **Check Auth Service**:
  ```bash
  docker compose logs auth-service
  ```
  *Expected: "MongoDB connected successfully" and "Express HTTP server running on port 3001".*
- **Check Core API**:
  ```bash
  docker compose logs core-api
  ```
  *Expected: "Connected to MongoDB" and "Server running on port 3002".*

### Step 6: Running the Frontend Clients

#### 1. Admin Web Panel (React SPA)
The Admin Web panel is already containerized and running on port 3000 via Docker. However, if you wish to run it natively for development:
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

#### 2. React Native Mobile App (Expo)
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

**Running on Android Studio Emulator:**
If you prefer to run the app on an Android emulator instead of a physical device:
1. Open **Android Studio**.
2. Go to **Tools** > **Device Manager**.
3. Create a new Virtual Device (e.g., Pixel 6 with the latest API level) if you haven't already.
4. Click the **Play** button next to your virtual device to boot up the emulator.
5. Once the emulator is fully booted, go back to your terminal where `npx expo start` is running.
6. Press `a` in the terminal to automatically install Expo Go and launch the app on the running Android emulator.

*(Alternatively, you can press `i` to launch it on an iOS simulator if you are on a Mac with Xcode installed, or scan the generated QR code using the **Expo Go** application on your physical smartphone).*

---

## 💻 IDE Setup (WebStorm)

If you are using **WebStorm** (or IntelliJ IDEA) to develop this project, follow these specific steps to configure your workspace for maximum productivity:

1. **Open the Project:**
   Launch WebStorm and click **Open**. Select the root folder of the project (`/home/xukki/FLM/Ki7/MMA/Project_ASM/LMS`). This allows WebStorm to index all microservices and apps in the monorepo.
2. **Configure TypeScript:**
   Since the project uses TypeScript across different microservices, WebStorm should automatically detect it. If you encounter unresolved imports, go to **Settings/Preferences** > **Languages & Frameworks** > **TypeScript** and ensure the **Node interpreter** and **TypeScript version** are correctly detected.
3. **Configure ESLint & Prettier (If applicable):**
   Go to **Settings** > **Languages & Frameworks** > **JavaScript** > **Code Quality Tools** > **ESLint** and set it to "Automatic ESLint configuration".
4. **Running Services via Run Configurations:**
   You can run individual Node.js microservices directly from WebStorm. 
   - Click **Run** > **Edit Configurations...**
   - Click the **+** button and select **npm**.
   - Set the **package.json** path (e.g., to `services/auth-service/package.json`).
   - Set the **Command** to `run` and the **Scripts** to `dev` or `build`.
   - Now you can start the services directly from the WebStorm UI with a single click.
5. **Docker Integration:**
   WebStorm has native Docker support. You can open the `docker-compose.yml` file, and WebStorm will show gutter icons next to each service. Click the double-play icon at the top of the file to start all containers, or click next to a specific service (like `mongodb`) to start only that container.

---

## 🛑 Teardown and Maintenance

To stop the containers while preserving all database and volume data:
```bash
docker compose down
```

To completely purge all containers, networks, and **delete all local database volumes** (Useful for a hard reset):
```bash
docker compose down -v
```

---

## 🛠️ Troubleshooting Guide

- **Nginx Permission Denied Error (`nginx.conf`)**:
  If Nginx fails to start due to permission issues reading `nginx.conf`, ensure the volume mount in `docker-compose.yml` includes the `:ro,z` flag to satisfy SELinux contexts on Linux hosts. (This is already fixed in the current configuration).
- **LocalStack Auth/License Error**:
  If LocalStack crashes complaining about a missing Pro License or `LOCALSTACK_AUTH_TOKEN`, ensure you are using the provided `docker-compose.yml` which removes `cognito-idp` from LocalStack's `SERVICES` and uses the dedicated `mock-cognito` container instead.
- **Port Conflicts**:
  If you encounter `bind: address already in use` errors during `docker compose up`, ensure that ports 80, 3000, 4566, 5432, 27017, and 6379 are not being used by native services on your host machine (like a local Postgres or Redis installation).

---

## 📚 Documentation Links

For further information regarding schema design, real-time protocols, and inter-service communications, refer to:
* **System Architecture**: [docs/architecture.md](docs/architecture.md)
* **API Design & Protocols**: [docs/api_design.md](docs/api_design.md)
