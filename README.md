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
| `http://localhost:27017` | MongoDB |
| `http://localhost:5432` | PostgreSQL |
| `http://localhost:6379` | Redis |

## Quick Start

### Prerequisites

* Docker Desktop or Docker Engine + Compose
* Node.js 18+ or 20+
* npm

### Run Everything

```bash
docker compose up --build
```

This starts all 11 containers:

* `nginx`
* `auth-service`
* `core-api`
* `notification-svc`
* `worker`
* `admin-web`
* `mongodb`
* `postgres`
* `redis`
* `localstack`
* `mock-cognito`

### Stop Everything

```bash
docker compose down
```

To remove volumes too:

```bash
docker compose down -v
```

## Local Development

### auth-service

```bash
cd auth-service
npm install
npm run start:dev
```

### core-api

```bash
cd core-api
npm install
npm run start:dev
```

### notification-svc

```bash
cd notification-svc
npm install
npm run start:dev
```

### worker

```bash
cd worker
npm install
npm run start:dev
```

### admin-web

```bash
cd admin-web
npm install
npm run build
npm start
```

### mobile-app

```bash
cd mobile-app
npm install
npm start
```

Use `npm run android`, `npm run ios`, or `npm run web` for a specific target.

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
* `AUTH_SERVICE_GRPC_HOST` in code
* `AUTH_SERVICE_GRPC` in the current Compose file

### notification-svc

* `PORT`
* `MONGO_URI`

### worker

* `MONGO_URI`
* `REDIS_URI`
* `NOTIFICATION_SVC_GRPC`

## LocalStack

`infra/localstack/init-aws.sh` creates the `lms-uploads` S3 bucket on startup.

## Troubleshooting

* If `core-api` cannot reach auth gRPC, align `AUTH_SERVICE_GRPC_HOST` in code with the Compose env name or set it manually when running outside Docker.
* If Nginx fails to start, confirm port `80` is free.
* If `docker compose up` fails on data ports, check `3000`, `3001`, `3002`, `4566`, `50051`, `50052`, `5432`, `6379`, `27017`, and `9229`.

## Notes

* `nginx/nginx.conf` proxies `/api/auth/` to `auth-service`, `/api/` and `/socket.io/` to `core-api`, and `/` to `admin-web`.
* `core-api` uses Mongo/Mongoose models and also includes a Prisma/Postgres schema in `core-api/prisma/schema.prisma`.

## Documentation

* [docs/architecture.md](docs/architecture.md)
* [docs/api_design.md](docs/api_design.md)
* [docs/final_validation_summary.md](docs/final_validation_summary.md)
