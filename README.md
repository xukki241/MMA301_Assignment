# EdTech LMS Platform

A multi-service Learning Management System built for schools and universities.
The monorepo uses **Node.js / TypeScript** backend services, **MongoDB** as the primary runtime database, **Redis / BullMQ** for background jobs, **gRPC** for internal service contracts, a **React / Vite** admin dashboard, an **Expo / React Native** mobile app, and **Docker Compose** for local development.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Runtime Services](#runtime-services)
3. [Database Layout](#database-layout)
4. [Prerequisites](#prerequisites)
5. [Setup Option 1 — Local (host processes + Docker infra)](#setup-option-1--local)
6. [Setup Option 2 — Full Docker Stack](#setup-option-2--full-docker-stack)
7. [Environment Variables Reference](#environment-variables-reference)
8. [Seed Data](#seed-data)
9. [Inspecting Data — MongoDB Compass](#inspecting-data--mongodb-compass)
10. [Optional SQL Stack (PostgreSQL + pgAdmin)](#optional-sql-stack)
11. [Troubleshooting](#troubleshooting)
12. [Verification Commands](#verification-commands)
13. [Further Documentation](#further-documentation)

---

## Architecture Overview

```
Browser / Mobile App
        │
    [nginx :80]
        │
   ┌────┴─────────────────────┐
   │                          │
[auth-service :3001]   [core-api :3002]
       │  gRPC :50051          │  gRPC → [notification-svc :50052]
       │                       │
       └────────┬──────────────┘
                │
           [MongoDB :27017]   [Redis :6379]
                │
          [localstack :4566]  [mock-cognito :9229]
```

---

## Runtime Services

| Service | Purpose | Host Ports |
|---|---|---|
| `nginx` | Reverse proxy for web and API traffic | `80` |
| `auth-service` | Users, roles, JWT auth, Cognito bridge, auth gRPC server | `3001`, `50051` |
| `core-api` | Main LMS API — classes, submissions, grades, alerts, Socket.IO | `3002` |
| `notification-svc` | gRPC notification stream and notification persistence | `50052` |
| `worker` | BullMQ background jobs (grading, alerts, notifications) | *(internal)* |
| `admin-web` | React / Vite admin dashboard | `3000` |
| `mobile-app` | Expo / React Native student client | Expo dev ports |
| `mongodb` | Primary runtime database for all collections | `27017` |
| `redis` | BullMQ queue store and Socket.IO adapter | `6379` |
| `localstack` | Local AWS S3 emulation for file uploads | `4566` |
| `mock-cognito` | Local Cognito emulation for auth flows | `9229` |
| `postgres` | Optional SQL mirror *(profile: sql)* | `5432` |
| `pgadmin` | Optional PostgreSQL admin UI *(profile: sql)* | `5050` |

---

## Database Layout

MongoDB is the **only required runtime database**. All collections live in a single shared database:

```
mongodb://localhost:27017/lms-db
```

| Namespace | Collections |
|---|---|
| **Auth** | `users`, `roles`, `userroles` |
| **LMS core** | `classes`, `enrollments`, `topics`, `materials`, `exercises` |
| **Submissions** | `submissions`, `submissionfiles`, `grades`, `privatenotes` |
| **Communication** | `classposts`, `postcomments`, `notifications`, `devicetokens` |
| **Analytics** | `attendancelogs`, `studentperformancemetrics`, `alertlogs`, `alertthresholds` |
| **Config / Ops** | `classsettings`, `quizbanks`, `systemlogs` |

> PostgreSQL and Prisma are **retained as optional tooling** for ERD inspection and future SQL-backed work.
> They are not required for the default runtime path and `core-api` does not depend on Postgres to start.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 18+ | LTS recommended |
| pnpm | 9.x | `npm install -g pnpm` |
| Docker Desktop | 4.x+ | Docker Compose v2 included |
| MongoDB Compass | Latest | GUI for inspecting MongoDB data |

> **Windows users:** use `pnpm.cmd` instead of `pnpm` if the bare command is blocked by execution policy.

### Windows port-conflict warning

If you have a **MongoDB Windows Service** installed locally, it will occupy port `27017` and the Docker container will silently receive no traffic on that port.

**Fix before you start:**

1. Open `services.msc`
2. Find **MongoDB Server (MongoDB)**
3. Right-click **Stop**, then Properties → Startup type: **Disabled**

Verify:

```powershell
netstat -ano | findstr ":27017"
# Should show only ONE PID — the Docker process
```

---

## Setup Option 1 — Local

Run backing infrastructure in Docker, run application services directly on the host.

### 1. Start infrastructure containers

```bash
docker compose up -d mongodb redis localstack mock-cognito
```

Wait for containers to be healthy:

```bash
docker compose ps
```

### 2. Install dependencies

```bash
pnpm install
# Windows:
pnpm.cmd install
```

### 3. Configure environment variables

Create `auth-service/.env`:

```env
PORT=3001
GRPC_PORT=50051
MONGO_URI=mongodb://localhost:27017/lms-db
JWT_SECRET=supersecretjwtkey123!
COGNITO_ENDPOINT=http://localhost:9229
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=mock
AWS_SECRET_ACCESS_KEY=mock
```

Create `core-api/.env`:

```env
PORT=3002
MONGO_URI=mongodb://localhost:27017/lms-db
REDIS_URI=redis://localhost:6379
AUTH_SERVICE_GRPC_HOST=localhost:50051
```

### 4. Seed MongoDB

```bash
# From workspace root
pnpm seed

# Or explicitly
pnpm --filter core-api run seed:mongo

# Windows
pnpm.cmd --filter core-api run seed:mongo
```

Expected output:

```
Seeded MongoDB demo data into one database.
```

Verify inside Docker container:

```bash
docker exec mma301_assignment-mongodb-1 mongosh "mongodb://localhost:27017/lms-db" --eval "db.stats()"
# Expected: collections: 23, objects: 244
```

### 5. Start application services

```bash
pnpm --filter auth-service dev
pnpm --filter core-api dev
pnpm --filter notification-svc dev
pnpm --filter worker dev
pnpm --filter admin-web dev
pnpm --filter mobile-app dev  # optional
```

Or run all in parallel through Turbo:

```bash
pnpm dev
```

---

## Setup Option 2 — Full Docker Stack

### 1. Build and start all services

```bash
docker compose up --build
# or detached
docker compose up -d --build
```

Start only specific services:

```bash
# Infrastructure only
docker compose up -d mongodb redis localstack mock-cognito

# Add application services
docker compose up -d auth-service core-api worker notification-svc
```

### 2. Seed MongoDB (Docker mode)

```bash
docker compose exec core-api pnpm run seed:mongo
```

### 3. Inspect seed inside container

```bash
docker exec mma301_assignment-mongodb-1 mongosh "mongodb://localhost:27017/lms-db" --eval "db.stats()"
```

### 4. Stop the stack

```bash
docker compose down        # stop containers
docker compose down -v     # stop + remove all volumes (full reset)
```

---

## Environment Variables Reference

### Shared MongoDB URI

| Mode | Value |
|---|---|
| Host (local dev) | `mongodb://localhost:27017/lms-db` |
| Docker service-to-service | `mongodb://mongodb:27017/lms-db` |

### `auth-service`

```env
PORT=3001
GRPC_PORT=50051
MONGO_URI=mongodb://localhost:27017/lms-db
JWT_SECRET=supersecretjwtkey123!
COGNITO_ENDPOINT=http://localhost:9229
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=mock
AWS_SECRET_ACCESS_KEY=mock
```

In Docker, change:
- `MONGO_URI` → `mongodb://mongodb:27017/lms-db`
- `COGNITO_ENDPOINT` → `http://mock-cognito:9229`

### `core-api`

```env
PORT=3002
MONGO_URI=mongodb://localhost:27017/lms-db
REDIS_URI=redis://localhost:6379
AUTH_SERVICE_GRPC_HOST=localhost:50051
```

In Docker, change:
- `MONGO_URI` → `mongodb://mongodb:27017/lms-db`
- `REDIS_URI` → `redis://redis:6379`
- `AUTH_SERVICE_GRPC_HOST` → `auth-service:50051`

### `notification-svc`

```env
PORT=50051
MONGO_URI=mongodb://localhost:27017/lms-db
```

### `worker`

```env
MONGO_URI=mongodb://localhost:27017/lms-db
REDIS_URI=redis://localhost:6379
NOTIFICATION_SVC_GRPC=localhost:50052
```

### Optional SQL (`core-api`)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lms-core-db?schema=public
```

---

## Seed Data

### What gets seeded

| Entity | Count |
|---|---|
| Roles | 3 (Admin, Teacher, Student) |
| Users | 22 (1 admin, 6 teachers, 15 students) |
| Classes | 5 (LMS101–LMS105) |
| Enrollments | 30 (6 per class) |
| Topics | 10 (2 per class) |
| Materials | 10 (1 PDF per topic) |
| Exercises | 10 (1 assignment per topic) |
| Submissions / Files / Grades | 6 each (class LMS101, topic 1) |
| Attendance logs | 30 |
| Performance metrics | 30 |
| Alert thresholds | 15 (3 per class) |
| Class posts + comments | 5 + 5 |
| Notifications | 8 |
| Device tokens | 3 (web, ios, android) |
| System log | 1 |

### Demo credentials

All seeded users share the same password: `Password123!`

| Email | Role |
|---|---|
| `admin@example.com` | Admin |
| `teacher@example.com` | Teacher (primary) |
| `student@example.com` | Student (primary) |
| `teacher1–5@example.com` | Teacher |
| `student1–14@example.com` | Student |

### Re-seeding

The seed uses `reset-dev` behavior — idempotent, safe to re-run. It removes and recreates only deterministic demo records using fixed ObjectIds.

```bash
pnpm seed
```

> Never run against a production database.

---

## Inspecting Data — MongoDB Compass

### Connect

Open Compass, connect to: `mongodb://localhost:27017`

Navigate: `localhost:27017` → `lms-db` → any collection.

> If Compass shows only `admin`, `config`, `local` — you are connected to a local MongoDB Windows Service.
> Stop that service first (see Prerequisites).

### Filter queries (Documents tab)

| Goal | Filter |
|---|---|
| All active classes | `{ "status": "active" }` |
| Find by class code | `{ "classCode": "LMS101" }` |
| Enrolled students | `{ "status": "enrolled" }` |
| Grades ≥ 80 | `{ "points": { "$gte": 80 } }` |
| Late attendance | `{ "status": "late" }` |
| At-risk students | `{ "riskLevel": "Warning" }` |
| Find user by email | `{ "email": "teacher1@example.com" }` |
| Verify seed ran | `{ "serviceName": "seed-mongo" }` |

Sort descending by points (SORT box): `{ "points": -1 }`

Show specific fields only (PROJECT box): `{ "name": 1, "classCode": 1, "_id": 0 }`

### Mongosh shell queries

```js
use lms-db

db.stats()

db.classes.find().pretty()

// Enrollments for a class
db.enrollments.find({ classId: ObjectId("64c000000000000000000001") })

// Student count per class
db.enrollments.aggregate([
  { $group: { _id: "$classId", count: { $sum: 1 } } }
])

// Average grade
db.grades.aggregate([
  { $group: { _id: null, avg: { $avg: "$points" }, max: { $max: "$points" } } }
])
```

---

## Optional SQL Stack

### Start

```bash
docker compose --profile sql up -d postgres pgadmin
```

### pgAdmin

```
URL:      http://localhost:5050
Email:    admin@example.com
Password: admin
```

Register server in pgAdmin:

| Field | Value |
|---|---|
| Host | `postgres` |
| Port | `5432` |
| Database | `lms-core-db` |
| Username | `postgres` |
| Password | `postgres` |

### Prisma commands

```bash
pnpm db:generate   # regenerate Prisma client
pnpm db:migrate    # apply migrations
pnpm seed:prisma   # seed SQL demo data
```

---

## Troubleshooting

### Seed data not visible in Compass

Compass is connected to a local MongoDB Windows Service, not Docker.

Fix: Stop the Windows MongoDB service (`services.msc`), reconnect Compass, re-run `pnpm seed`.

### Port 27017 conflict

```powershell
netstat -ano | findstr ":27017"
Get-Service -Name MongoDB
```

Stop the service via `services.msc` → MongoDB Server → Stop → Startup type: Disabled.

### Docker container name

```
mma301_assignment-mongodb-1
```

### gRPC connection failures

| Environment | `AUTH_SERVICE_GRPC_HOST` value |
|---|---|
| Docker | `auth-service:50051` |
| Host | `localhost:50051` |

### Required free ports

`80`, `3000`, `3001`, `3002`, `4566`, `6379`, `9229`, `27017`, `50051`, `50052`

### Windows PowerShell

```powershell
pnpm.cmd install
pnpm.cmd --filter core-api run seed:mongo
```

---

## Verification Commands

```bash
# Full build and type check
pnpm build
pnpm typecheck

# Backend only
pnpm turbo build --filter=auth-service --filter=core-api --filter=notification-svc --filter=worker
pnpm turbo typecheck --filter=auth-service --filter=core-api --filter=notification-svc --filter=worker

# Validate Compose config
docker compose config

# Verify seed
docker exec mma301_assignment-mongodb-1 mongosh "mongodb://localhost:27017/lms-db" --eval "db.stats()"
```

---

## Further Documentation

| File | Contents |
|---|---|
| [docs/architecture.md](docs/architecture.md) | System architecture, service responsibilities, data flow |
| [docs/api_design.md](docs/api_design.md) | REST API endpoint reference |
| [docs/db/schema-audit.md](docs/db/schema-audit.md) | MongoDB collection schema definitions |
| [docs/db/runbook.md](docs/db/runbook.md) | Database operations runbook |
| [docs/db/compass-guide.md](docs/db/compass-guide.md) | MongoDB Compass usage guide |
| [docs/db/seed-reference.md](docs/db/seed-reference.md) | Full seed data reference |
| [docs/setup/local.md](docs/setup/local.md) | Detailed local dev setup |
| [docs/setup/docker.md](docs/setup/docker.md) | Detailed Docker setup |
| [docs/setup/windows.md](docs/setup/windows.md) | Windows-specific notes |
