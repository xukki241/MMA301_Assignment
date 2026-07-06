# Original User Request

## Initial Request — 2026-07-06T03:36:32Z

# Teamwork Project Prompt — Draft

> Status: Step 1-4 — Drafting requirements based on plan and role requests
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Build an EdTech LMS platform (React Native mobile app, React web admin, Express.js microservices) based on an existing detailed implementation plan.

Working directory: `~/teamwork_projects/edtech_lms`

## Requirements

### R1. Implement the LMS Platform
Implement the EdTech LMS Platform exactly as described in the provided implementation plan. This includes the Auth Service, Core API, Background Worker, Notification Service, Nginx proxy, MongoDB/PostgreSQL databases, Redis, LocalStack, React Native Expo app, and React.js admin web panel.

### R2. Role-Based Execution
You must organize your internal team of subagents to fulfill the following specific roles requested by the user:
- **1 Documentation Agent**: Responsible for all markdown files (READMEs, docs, updating the implementation plan).
- **1 Database Design Agent**: Responsible only for DB design and creating beautiful `drawdb` (JSON) and `.drawio` ERD files.
- **2 Developer Agents**: Responsible for implementing the actual project code (frontend, backend, infrastructure) together.
- **1 QA/Validation Agent**: Responsible for checking, validating the code against the implementation plan, and writing the final result summary files.

## Acceptance Criteria

### Infrastructure & Backend
- [ ] `docker-compose up` successfully starts all 10 defined services without crashing.
- [ ] Swagger API documentation is available at `/api/docs`.
- [ ] Database schemas (Mongoose models and Prisma schema) match the 23-table baseline.

### Database Deliverables
- [ ] A valid `.drawio` file representing the relational schema (PostgreSQL) is present in the repository.
- [ ] A valid `drawdb` compatible JSON file representing the document schema (MongoDB) is present.

### Frontend
- [ ] The React Native Expo project initializes and builds without errors.
- [ ] The React.js admin web panel initializes and builds without errors.

### QA & Documentation
- [ ] A final validation summary markdown file is present, detailing what was verified against the implementation plan.
- [ ] All required markdown documentation (including API docs instructions) is present and well-formatted.

---
# EdTech LMS Platform — Implementation Plan

> Compiled from design interview session on 2026-07-06.
> This is a living document. The ERD is expandable beyond 23 tables.

---

## Overview

A full-stack EdTech Learning Management System (LMS) with:
- A **React Native / Expo** cross-platform mobile app (iOS + Android)
- A **separate React.js web admin panel**
- A **hybrid microservice backend** (Auth Service + Core API Service)
- A **background job engine** for auto performance alerts
- A **real-time layer** for live class feeds
- **AWS-compatible infra** emulated locally via LocalStack + Docker

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                 Mobile App (Expo Router)                 │
│   Teacher / Student / Admin tabs — React Native          │
└────────────────────┬────────────────────────────────────┘
                     │ REST + WebSocket (Socket.IO)
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Nginx Reverse Proxy                     │
│  /api/auth/* → Auth Service  |  /api/* → Core API       │
└──────────┬───────────────────────────────┬──────────────┘
           │ gRPC (token validation)        │ REST
           ▼                               ▼
┌──────────────────┐          ┌───────────────────────────┐
│   Auth Service   │          │       Core API Service     │
│  Express.js      │          │  Express.js (MVC)          │
│  AWS Cognito     │          │  Socket.IO + Redis Adapter │
│  (LocalStack)    │          │  BullMQ + Redis            │
│  DB: MongoDB     │          │  DB: MongoDB (primary)     │
│  (auth-db)       │          │       PostgreSQL (bonus)   │
└──────────────────┘          └───────────────────────────┘
                                           │
                              ┌────────────┴────────────┐
                              │    Background Worker      │
                              │  BullMQ Job Processor    │
                              │  (daily metrics + alerts)│
                              └────────────┬────────────┘
                                           │ gRPC stream
                              ┌────────────▼────────────┐
                              │  Notification Service    │
                              │  FCM (Firebase Cloud     │
                              │  Messaging)              │
                              └─────────────────────────┘

     ┌──────────────────────────────────────────────┐
     │             LocalStack (AWS Emulation)        │
     │   Cognito  |  S3 (file storage)  |  SQS*     │
     └──────────────────────────────────────────────┘

     ┌──────────────────────────────────────────────┐
     │               Infrastructure                  │
     │  Redis  |  MongoDB  |  PostgreSQL  |  Nginx   │
     └──────────────────────────────────────────────┘
```

---

## Tech Stack Summary

| Layer | Technology | Rationale |
|---|---|---|
| **Mobile App** | React Native + Expo | Cross-platform iOS/Android |
| **Mobile Router** | Expo Router (file-based) | Modern URL-based navigation |
| **Mobile State** | Zustand + TanStack Query | Global state + server cache |
| **Mobile Charts** | Victory Native v40+ (Skia) | Pie/bar/line for dashboards |
| **API Protocol** | REST + gRPC (hybrid) | REST for CRUD, gRPC for inter-service |
| **Backend Framework** | Express.js (MVC convention) | Lightweight, organized |
| **Auth Service** | AWS Cognito via LocalStack | Production-grade IDP, locally emulated |
| **File Storage** | AWS S3 via LocalStack | Pre-signed URLs for uploads |
| **Primary Database** | MongoDB (Mongoose ODM) | Compulsory; document flexibility |
| **Secondary Database** | PostgreSQL (Prisma ORM) | Optional/bonus; relational integrity |
| **DB Strategy** | Database-per-service | Auth DB + Core DB separated |
| **Job Queue** | BullMQ + Redis | Persistent, retryable background jobs |
| **Real-time** | Socket.IO + Redis Adapter | Class rooms, live posts/comments/grades |
| **Push Notifications** | Firebase Cloud Messaging (FCM) | Industry standard, full mobile support |
| **Reverse Proxy** | Nginx | Routes /auth/* and /api/* |
| **Containerization** | Docker Compose (primary) | All services in one compose stack |
| **Orchestration** | K8s manifests (bonus) | Kubernetes as stretch goal |
| **API Docs** | Swagger/OpenAPI 3.0 + .proto files | Auto-generated, interactive |
| **Admin Web Panel** | React.js SPA | Desktop admin interface |

---

## Database Split Strategy

### MongoDB Collections (Primary — compulsory)

**Auth Service DB (`lms-auth-db`)**
- `users` — email, passwordHash (Cognito mirror), fullName, avatarURL, createdAt
- `roles` — roleName
- `userRoles` — userId, roleId

**Core API DB (`lms-core-db`)**
- `classes` — teacherId, className, subject, classCode (unique), description
- `enrollments` — classId, studentId, status (Active/Dropped)
- `topics` — classId, title, orderIndex
- `materials` — topicId, title, contentText, attachmentURL
- `exercises` — classId, topicId, title, instructions, dueDate, maxPoints, allowedExtensions
- `submissions` — exerciseId, studentId, status (OnTime/Late)
- `submissionFiles` — submissionId, fileName, filePathUrl, fileSize
- `grades` — submissionId, gradedById, score, feedback, gradedAt
- `attendanceLogs` — classId, studentId, sessionDate, status
- `alertThresholds` — classId, minPassingGrade, maxMissingAssignments, alertFrequencyDays
- `studentPerformanceMetrics` — classId, studentId, currentAverage, missingCount, riskLevel, lastCalculated
- `alertLogs` — classId, studentId, triggeredBy, message, sentAt, isReadByStudent
- `classPosts` — classId, authorId, content, createdAt
- `postComments` — postId, authorId, content, createdAt
- `privateNotes` — submissionId, senderId, content, sentAt
- `notifications` — receiverId, title, body, type, isRead, createdAt
- `systemLogs` — userId, action, ipAddress, timestamp
- `classSettings` — classId, allowStudentPosts, enableGradeAutoAlerts, themeColor

> **Note:** This is 20+ collections. The ERD is open for expansion. Possible additions: `QuizBanks`, `CourseCalendars`, `StudentAchievements`, `TeacherNotes`, `FileVersions`.

### PostgreSQL Tables (Bonus — optional)
Maps all the same entities as normalized relational tables with full referential integrity and foreign keys. Prisma schema will mirror the MongoDB model.

---

## Service Architecture

### Auth Service
- **Port:** 3001 (internal), exposed via Nginx at `/api/auth/*`
- **Framework:** Express.js
- **Responsibilities:**
  - Register / Login via AWS Cognito (LocalStack)
  - Issue JWT access token + refresh token
  - gRPC server: `ValidateToken(token)` → returns `{userId, roles}`
  - Manage user profile and role assignment
- **Database:** MongoDB `lms-auth-db`

### Core API Service
- **Port:** 3002 (internal), exposed via Nginx at `/api/*`
- **Framework:** Express.js (MVC: `routes/`, `controllers/`, `services/`, `models/`)
- **Responsibilities:** All business logic — classes, topics, materials, exercises, submissions, grades, attendance, posts, comments, notifications
- **gRPC client:** Calls Auth Service to validate tokens on every request (middleware)
- **Socket.IO:** Emits events per class room (`class:{classId}`) for new posts, comments, grade updates
- **Database:** MongoDB `lms-core-db` (+ optional PostgreSQL)

### Background Worker (BullMQ)
- **Runs inside Core API** or as a separate container
- **Daily Job:** Recalculates `studentPerformanceMetrics` for all active classes, sets `riskLevel` (Good/Warning/Critical), writes `alertLogs`, and enqueues FCM push notifications via Notification Service

### Notification Service (gRPC streaming)
- **Responsibility:** Receives notification payloads from Core API via gRPC stream, dispatches FCM push notifications to mobile devices
- **Stores:** FCM device tokens mapped to `userId` in `users` collection

---

## Mobile App Structure (Expo Router)

```
app/
├── (auth)/
│   ├── login.tsx
│   └── register.tsx
├── (teacher)/
│   ├── _layout.tsx         ← Bottom tab: Home, Classes, Assignments, Alerts, Profile
│   ├── index.tsx           ← Dashboard (risk pie chart, at-risk student list)
│   ├── classes/
│   │   ├── index.tsx       ← My Classes list
│   │   ├── [classId]/
│   │   │   ├── stream.tsx  ← Class feed (posts/comments, Socket.IO)
│   │   │   ├── exercises.tsx
│   │   │   ├── members.tsx
│   │   │   └── settings.tsx
│   ├── exercises/
│   │   ├── create.tsx
│   │   └── [exerciseId]/
│   │       ├── submissions.tsx   ← List all submissions
│   │       └── grade/[subId].tsx ← Grade + feedback form
│   └── alerts.tsx          ← At-risk students, bulk notify button
├── (student)/
│   ├── _layout.tsx         ← Bottom tab: Home, Courses, Submit, Grades, Profile
│   ├── index.tsx           ← Dashboard (todo list, upcoming deadlines)
│   ├── courses/
│   │   ├── join.tsx        ← Enter ClassCode
│   │   └── [classId]/
│   │       ├── stream.tsx
│   │       ├── materials.tsx
│   │       └── submit/[exerciseId].tsx ← File picker + upload
│   └── grades.tsx          ← Grade timeline + progress charts
├── (admin)/
│   ├── _layout.tsx
│   ├── users.tsx
│   └── logs.tsx
└── notifications.tsx       ← In-app notification bell list
```

---

## Must-Have Features

| # | Feature | Primary Role | Status |
|---|---|---|---|
| 1 | Auth (Cognito, roles: Teacher/Student/Admin) | All | Must-Have |
| 2 | Class create + join by ClassCode | Teacher/Student | Must-Have |
| 3 | Topic & Material management | Teacher | Must-Have |
| 4 | Exercise creation + file submission (ZIP/PDF) | Both | Must-Have |
| 5 | Grading & text feedback | Teacher | Must-Have |
| 6 | Auto-alert engine (BullMQ daily job) | System | Must-Have |
| 7 | Teacher dashboard (risk pie chart, bulk alert) | Teacher | Must-Have |
| 8 | Student dashboard (to-do, progress charts) | Student | Must-Have |
| 9 | Class stream (posts + comments, real-time) | Both | Must-Have |
| 10 | Private notes on submissions | Teacher/Student | Must-Have |
| 11 | In-app notification list | All | Must-Have |
| 12 | Admin panel (web + mobile tab) | Admin | Must-Have |
| 13 | Real-time via Socket.IO | Both | Must-Have |

---

## Docker Compose Services

```yaml
services:
  nginx:            # Reverse proxy (port 80)
  auth-service:     # Express.js + gRPC server (port 3001)
  core-api:         # Express.js + Socket.IO (port 3002)
  worker:           # BullMQ job processor
  notification-svc: # gRPC streaming + FCM dispatcher
  mongodb:          # MongoDB (port 27017, two DBs)
  postgres:         # PostgreSQL (port 5432)
  redis:            # Redis (port 6379) — BullMQ + Socket.IO adapter
  localstack:       # AWS emulation — Cognito + S3 (port 4566)
  admin-web:        # React.js SPA (port 3000)
```

---

## API Documentation Plan

- **REST APIs:** Swagger UI auto-generated via `swagger-jsdoc` + `swagger-ui-express`, served at `/api/docs`
- **gRPC:** `.proto` files in `proto/` directory at repo root:
  - `auth.proto` — `ValidateToken`, `GetUser`
  - `notification.proto` — `StreamNotification` (server-side streaming)

---

## ERD Deliverables

- **DrawIO (.drawio):** Full relational ERD for PostgreSQL (normalized, FK relationships)
- **DrawDB compatible JSON:** MongoDB collection diagram
- Both will be generated as a deliverable file. The 23 tables are a baseline; the schema is open for expansion.

---

## Verification Plan

### Automated
- Unit tests: Jest for service-layer logic (grade calculation, risk level algorithm)
- API tests: Supertest for REST endpoints
- gRPC tests: `@grpc/grpc-js` client test scripts

### Manual
- `docker-compose up` → all 9 services start successfully
- Register as Teacher → create class → share code
- Register as Student → join class → submit a ZIP file (S3 upload)
- Teacher grades submission → Student receives FCM push notification
- Verify BullMQ daily job triggers → `studentPerformanceMetrics` updated → `alertLogs` written
- Socket.IO: Two devices in same class room see live post appear without refresh
