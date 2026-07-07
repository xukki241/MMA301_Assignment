# System Architecture — EdTech LMS Platform

This document describes the overall system architecture, data flow, component interactions, and tech stack justifications for the EdTech LMS platform.

---

## 1. High-Level Architecture Overview

The EdTech LMS Platform is designed as a hybrid microservices-based system to balance separation of concerns with development velocity. The key architectural components are:

1. **Client Tier**:
   - **Mobile App**: A cross-platform React Native app powered by Expo.
   - **Admin Web Panel**: A React.js Single Page Application (SPA) for institute-level administrative control.
2. **Gateway Tier**:
   - **Nginx Reverse Proxy**: Single entry point for all API traffic, routing requests based on path prefixes.
3. **Service Tier**:
   - **Auth Service**: Manages user profiles, role assignments, and authentication states using AWS Cognito (emulated via `mock-cognito`).
   - **Core API Service**: Handles the core LMS domain logic (classes, topics, exercises, submissions, grading, attendance, and feeds).
   - **Background Worker**: Processes asynchronous and scheduled jobs (student performance metrics and alert generation) using BullMQ.
   - **Notification Service**: A dedicated service that consumes notification streams and dispatches push notifications via Firebase Cloud Messaging (FCM).
4. **Data & Infrastructure Tier**:
   - **Databases**: MongoDB as the current shared runtime database, with PostgreSQL retained as an optional secondary schema for inspection and future SQL-backed work.
   - **Cache & Event Broker**: Redis, serving as the BullMQ backplane and Socket.IO adapter.
   - **Cloud Emulation**: LocalStack (for offline AWS S3 storage) and Mock Cognito (for offline AWS Cognito user pools).

### System Topology Diagram

```
                              ┌─────────────────────────────────────────┐
                              │        Mobile App (React Native Expo)   │
                              │        Admin Web Panel (React SPA)      │
                              └────────────────────┬────────────────────┘
                                                   │
                                                   │ HTTPS / WSS
                                                   ▼
                              ┌─────────────────────────────────────────┐
                              │           Nginx Reverse Proxy           │
                              │                (Port 80)                │
                              └──────┬───────────────────────────┬──────┘
                                     │                           │
                   /api/auth/*       │                           │ /api/*
                  (auth routing)     ▼                           ▼ (core routing)
                            ┌────────────────┐           ┌──────────────────────┐
                            │  Auth Service  │           │   Core API Service   │
                            │  (Port 3001)   │           │     (Port 3002)      │
                            └───────┬────────┘           └───────┬───────┬──────┘
                                    │                            │       │
                                    │    gRPC Token Validation   │       │
                                    │◄───────────────────────────┘       │ Socket.IO
                                     │ (ValidateToken / GetUser)          │ (Real-time events)
                                     ▼                                    ▼
                             ┌────────────────┐   ┌───────────────┐  ┌──────────────┐
                             │  Mock Cognito  │   │  LocalStack   │  │    Redis     │
                             │  (Port 9229)   │   │  (Port 4566)  │  │ (Port 6379)  │
                             │  AWS Cognito   │   │    AWS S3     │  └───────┬──────┘
                             └────────────────┘   └───────────────┘          │
                                                                             │ BullMQ
                                                                             ▼
                                                                 ┌──────────────┐
                                                                 │ Background   │
                                                                 │   Worker     │
                                                                 └───────┬──────┘
                                                                         │
                                                                         │ gRPC Stream
                                                                         ▼
                                                                 ┌──────────────┐
                                                                 │ Notification │
                                                                 │   Service    │
                                                                 └───────┬──────┘
                                                                         │
                                                                         ▼ Push Notifications
                                                                     [ FCM / APNS ]
```

---

## 2. Component Directory & Microservice Breakdown

| Service / Component | Description | Port | Key Technologies | Primary Database |
|---|---|---|---|---|
| **Nginx Proxy** | Handles path-based routing, SSL termination, and static asset distribution. | `80` (HTTP) | Nginx | N/A |
| **Auth Service** | Manages user registration, login, role mapping, and JWT verification. | `3001` (HTTP/gRPC) | Express.js, `@grpc/grpc-js`, AWS SDK | MongoDB (`lms-db`) |
| **Core API Service** | Orchestrates course management, student submissions, grades, and class discussions. | `3002` (HTTP) | Express.js, Socket.IO, `bullmq` | MongoDB (`lms-db`) |
| **Background Worker** | Consumes BullMQ jobs to run periodic cron checks and calculate performance metrics. | N/A (Internal) | Node.js, `bullmq` | MongoDB (`lms-db`) |
| **Notification Service**| Accepts gRPC stream payloads and forwards them to mobile devices via FCM. | `50051` (gRPC) | Node.js, `@grpc/grpc-js`, Firebase Admin | MongoDB (`lms-db`) |
| **Admin Web Panel** | React-based UI for administrative duties like user auditing and system logs review. | `3000` | React.js (SPA), Vite, TailwindCSS | N/A |
| **Mobile Application** | Hybrid mobile client for students and teachers. | Developer port | Expo, React Native, Zustand, TanStack Query | SQLite (local cache) |

---

## 3. Data Flow Architecture

### 3.1 Authentication & Request Lifecycle
1. The Client sends an authentication request (`POST /api/auth/login`) which Nginx routes to the **Auth Service**.
2. The **Auth Service** authenticates the credentials against AWS Cognito (hosted inside the `mock-cognito` container).
3. Upon success, Cognito returns an Identity token and Access token. The Auth Service records the profile details in `lms-db` and responds to the client with the JWT access and refresh tokens.
4. For subsequent requests to the **Core API** (e.g. `GET /api/classes`):
   - The Client passes the token in the `Authorization: Bearer <token>` header.
   - Nginx forwards the request to the **Core API Service**.
   - The Core API middleware intercepts the request, and invokes the `ValidateToken` gRPC method on the **Auth Service** to verify the signature and retrieve user context `{ userId, roles }`.
   - Once validated, the Core API processes the request and queries `lms-db`.

### 3.2 Real-time Feed & Live Update Flow
1. When a client (e.g. Teacher) posts a new comment or announcement (`POST /api/posts/:postId/comments`), the request is received by the **Core API Service**.
2. The Core API persists the comment to the `postComments` MongoDB collection.
3. The Core API publishes the event to the local Socket.IO server, which broadcast it to the room named `class:{classId}`.
4. Since there can be multiple instances of the Core API behind Nginx, a **Redis Adapter** is used to coordinate the message distribution across all Socket.IO server instances.
5. All students connected to the `class:{classId}` room receive a live `comment:created` event instantly, updating their UI without a manual refresh.

### 3.3 Background Analytics & Alert Engine Flow
1. A cron trigger inside the **Background Worker** fires daily (configured via BullMQ scheduler).
2. The worker retrieves all active classes from the database.
3. For each student enrolled in a class, the worker calculates performance statistics:
   - Average score of graded submissions.
   - Count of overdue/missing assignments.
   - Absences from attendance logs.
4. Based on the calculated indicators and matching `alertThresholds`, the worker assigns a `riskLevel` (`Good`, `Warning`, or `Critical`).
5. If the risk level exceeds the safe threshold, the worker:
   - Writes an entry to the `alertLogs` collection.
   - Enqueues a notification job to the `notification-queue` in Redis.
6. The **Core API** processes the `notification-queue` job and establishes a gRPC streaming connection to the **Notification Service**, sending a payload.
7. The **Notification Service** processes the payload, maps the recipient's `userId` to their registered FCM device token, and sends a push notification through FCM.

### 3.4 File Upload Workflow
To avoid bottlenecking backend services with large binary streams (e.g. large ZIP or PDF assignments):
1. The student client requests an upload slot: `POST /api/exercises/:exerciseId/submissions/presigned-url`.
2. The **Core API** verifies the enrollment and requests a pre-signed PUT URL from AWS S3 (via LocalStack client SDK).
3. The Core API returns the pre-signed URL to the client.
4. The client uploads the file directly to the S3 bucket using the pre-signed URL (bypassing Nginx and the Node.js API servers entirely).
5. Once the upload completes, the client makes a second call: `POST /api/exercises/:exerciseId/submissions` with the metadata (file name, S3 object path, and file size) to create the database records in MongoDB.

---

## 4. Tech Stack Rationale

- **React Native & Expo Router**: Provides a native-like user experience on iOS and Android from a single TypeScript codebase. Expo Router uses file-system conventions mapping to the physical structure of mobile layouts (tabs and drawers), matching modern web routing styles.
- **Express.js (MVC convention)**: Node's standard web framework. Highly lightweight, permitting quick response times. Standardizing on an MVC layout (`routes/controllers/services/models`) ensures clean separations.
- **gRPC (HTTP/2 Protocol)**: High-performance, low-latency framework utilizing Protocol Buffers (proto3). Ideal for backend-to-backend communication (Auth Token validation and Notification streaming) where serialization overhead must be minimal.
- **AWS Cognito (Mock) & S3 (LocalStack)**: Using Cognito ensures production-grade identity access management, user pools, and security out of the box. LocalStack emulates S3 locally, while the `mock-cognito` container emulates User Pools, enabling robust integration testing without incurring AWS cloud costs or requiring a LocalStack Pro license.
- **Current MongoDB runtime model**: MongoDB is the current source of truth because LMS objects are document-centric and hierarchically structured. Auth, roles, class streams, comments, submissions, alerts, notifications, and device tokens all live in `lms-db` to avoid split-brain state in the running app.
- **Retained PostgreSQL schema**: PostgreSQL and Prisma remain available for schema inspection, ERD work, and future SQL-backed development, but services do not require Postgres for normal local runtime.
- **Redis (BullMQ & Socket.IO)**: Redis is an extremely fast, in-memory data store. Its Pub/Sub capabilities are perfect for scaling Socket.IO channels horizontally, while its data structures backing BullMQ provide durable, lock-safe message queuing.
- **Firebase Cloud Messaging (FCM)**: The standard cloud service to dispatch push notifications across mobile platforms, ensuring compatibility with native OS power-saving states.
