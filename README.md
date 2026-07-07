# EdTech LMS Platform

A multi-service learning management system for schools and universities. The repo combines Node/TypeScript backend services, a React/Vite admin UI, an Expo mobile app, gRPC contracts, and a Docker Compose local stack.

## Overview

The platform is organized around these runtime pieces:

* `nginx/` routes browser and API traffic.
* `auth-service/` handles users, roles, JWT auth, and Cognito integration.
* `core-api/` owns the main LMS domain: classes, enrollments, topics, materials, submissions, grading, attendance, posts, comments, notifications, and alerts.
* `notification-svc/` exposes a gRPC notification service and device token storage.
* `worker/` runs BullMQ background jobs.
* `admin-web/` is the React/Vite admin dashboard.
* `mobile-app/` is the Expo / React Native client.
* `proto/`, `infra/`, and `docs/` hold shared contracts, local infrastructure scripts, and architecture notes.

## Repository Layout

```text
.
├── auth-service/
├── core-api/
├── notification-svc/
├── worker/
├── admin-web/
├── mobile-app/
├── nginx/
├── proto/
├── infra/
├── docs/
└── docker-compose.yml
```

## Services

| Service | Purpose | Main scripts | Host ports |
|---|---|---|---|
| `nginx` | Reverse proxy for web and API traffic | N/A | `80` |
| `auth-service` | Auth, users, roles, JWT, Cognito bridge | `build`, `start`, `start:dev`, `test` | `3001`, `50051` |
| `core-api` | Main LMS API and socket layer | `build`, `start`, `start:dev`, `test` | `3002` |
| `notification-svc` | gRPC notification service | `build`, `start`, `start:dev` | `50052` |
| `worker` | BullMQ background processing | `build`, `start`, `start:dev` | none |
| `admin-web` | React/Vite admin dashboard | `build`, `start` | `3000` |
| `mobile-app` | Expo / React Native app | `start`, `android`, `ios`, `web`, `ts:check` | none |
| `pgadmin` | PostgreSQL administration UI | N/A | `5050` |

## Local Ports

| Endpoint | Purpose |
|---|---|
| `http://localhost/` | Admin web via Nginx |
| `http://localhost/api/auth/` | Auth API via Nginx |
| `http://localhost/api/` | Core API via Nginx |
| `http://localhost:3000` | Admin web directly |
| `http://localhost:3001` | Auth service directly |
| `http://localhost:3002` | Core API directly |
| `localhost:50051` | Auth service gRPC |
| `localhost:50052` | Notification service gRPC |
| `http://localhost:4566` | LocalStack S3 |
| `http://localhost:9229` | Mock Cognito |
| `http://localhost:5050` | pgAdmin |
| `http://localhost:27017` | MongoDB |
| `http://localhost:5432` | PostgreSQL |
| `http://localhost:6379` | Redis |

## Setup Option 1: Run Services Locally One By One

Use this path when you want to debug each service directly from your terminal.

### Prerequisites

* Docker Desktop or Docker Engine + Compose
* Node.js 18+ or 20+
* npm

### Start Infrastructure Only

Start the shared backing services first:

```bash
docker compose up mongodb postgres pgadmin redis localstack mock-cognito
```

### Install Dependencies

Run once per service:

```bash
cd auth-service && npm install
cd ../core-api && npm install
cd ../notification-svc && npm install
cd ../worker && npm install
cd ../admin-web && npm install
cd ../mobile-app && npm install
```

### Seed Databases

There are exactly two seed scripts, both run from `core-api`:

```bash
cd core-api
npm run db:generate
npm run db:migrate
npm run seed:mongo
npm run seed:prisma
```

`seed:mongo` writes the full demo dataset to both Mongo databases: `lms-auth-db` and `lms-core-db`.

`seed:prisma` writes the matching demo dataset to PostgreSQL through Prisma.

### Start App Services

Open separate terminals:

```bash
cd auth-service
npm run start:dev
```

```bash
cd core-api
npm run start:dev
```

```bash
cd notification-svc
npm run start:dev
```

```bash
cd worker
npm run start:dev
```

```bash
cd admin-web
npm start
```

```bash
cd mobile-app
npm start
```

## Setup Option 2: Run Everything With Docker Once

Use this path when you want the whole stack to start in one command.

```bash
docker compose up --build
```

This starts all 12 containers in one run:

* `nginx`
* `auth-service`
* `core-api`
* `notification-svc`
* `worker`
* `admin-web`
* `mongodb`
* `postgres`
* `pgadmin`
* `redis`
* `localstack`
* `mock-cognito`

Then seed from inside the `core-api` container:

```bash
docker compose exec core-api npm run db:generate
docker compose exec core-api npm run db:migrate
docker compose exec core-api npm run seed:mongo
docker compose exec core-api npm run seed:prisma
```

### Stop Docker Stack

```bash
docker compose down
```

To remove volumes too:

```bash
docker compose down -v
```

## Environment Variables

Most local values are provided by `docker-compose.yml`.

### auth-service

* `PORT`
* `GRPC_PORT`
* `MONGO_URI`
* `JWT_SECRET`
* `COGNITO_ENDPOINT`
* `AWS_REGION`
* `AWS_ACCESS_KEY_ID`
* `AWS_SECRET_ACCESS_KEY`
* `USE_MOCK_COGNITO` optional for local mock mode

### core-api

* `PORT`
* `MONGO_URI`
* `REDIS_URI`
* `DATABASE_URL`
* `AUTH_SERVICE_GRPC_HOST`

Migration and seed commands:

```bash
npm run db:generate
npm run db:migrate
npm run seed:mongo
npm run seed:prisma
```

### notification-svc

* `PORT`
* `MONGO_URI`

### worker

* `MONGO_URI`
* `REDIS_URI`
* `NOTIFICATION_SVC_GRPC`

## LocalStack

`infra/localstack/init-aws.sh` creates the `lms-uploads` S3 bucket on startup.

## Database Setup

MongoDB is the primary runtime database. PostgreSQL is maintained as a secondary relational schema for future SQL-backed development and inspection.

Seed mode is `reset-dev`: demo records are removed and recreated without wiping unrelated data.

### The Two Seed Scripts

```bash
cd core-api
npm run seed:mongo
npm run seed:prisma
```

`seed:mongo` seeds all MongoDB data first, including auth users/roles and all LMS domain collections.

`seed:prisma` seeds PostgreSQL with the same auth and LMS demo dataset through Prisma.

Run migrations before `seed:prisma`:

```bash
cd core-api
npm run db:generate
npm run db:migrate
```

Inside Docker:

```bash
docker compose exec core-api npm run db:generate
docker compose exec core-api npm run db:migrate
docker compose exec core-api npm run seed:mongo
docker compose exec core-api npm run seed:prisma
```

Demo password for all seeded users:

```text
Password123!
```

Primary demo accounts:

```text
admin@example.com
teacher@example.com
student@example.com
```

See [docs/db/runbook.md](docs/db/runbook.md) for pgAdmin and database operations.

## Troubleshooting

* If `core-api` cannot reach auth gRPC, set `AUTH_SERVICE_GRPC_HOST=auth-service:50051` inside Docker or `AUTH_SERVICE_GRPC_HOST=localhost:50051` on the host.
* If Nginx fails to start, confirm port `80` is free.
* If `docker compose up` fails on data ports, check `3000`, `3001`, `3002`, `4566`, `50051`, `50052`, `5050`, `5432`, `6379`, `27017`, and `9229`.

## Notes

* `nginx/nginx.conf` proxies `/api/auth/` to `auth-service`, `/api/` and `/socket.io/` to `core-api`, and `/` to `admin-web`.
* `core-api` uses Mongo/Mongoose models and also includes a Prisma/Postgres schema in `core-api/prisma/schema.prisma`.

## Documentation

* [docs/architecture.md](docs/architecture.md)
* [docs/api_design.md](docs/api_design.md)
* [docs/final_validation_summary.md](docs/final_validation_summary.md)
* [docs/db/schema-audit.md](docs/db/schema-audit.md)
* [docs/db/runbook.md](docs/db/runbook.md)
