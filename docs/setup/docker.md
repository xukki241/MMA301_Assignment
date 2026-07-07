# Docker Setup Guide

Run the entire LMS platform inside Docker with no local Node.js required.

---

## Prerequisites

| Tool | Install |
|---|---|
| Docker Desktop 4.x+ | https://www.docker.com/products/docker-desktop |
| MongoDB Compass *(optional, for data inspection)* | https://www.mongodb.com/products/compass |

Make sure Docker Desktop is running before proceeding.

---

## Windows: Stop Local MongoDB Service First

If you have MongoDB installed locally on Windows, stop it before starting Docker to avoid a port 27017 conflict:

1. Open `services.msc`
2. Find **MongoDB Server (MongoDB)**
3. Right-click → **Stop** → Properties → Startup type: **Disabled**

---

## Option A — Start Everything

Build and start all services:

```bash
docker compose up --build
```

Detached (background) mode:

```bash
docker compose up -d --build
```

---

## Option B — Start Only What You Need

### Infrastructure only (no app code)

```bash
docker compose up -d mongodb redis localstack mock-cognito
```

### Add application services

```bash
docker compose up -d auth-service core-api worker notification-svc
```

### Add admin UI

```bash
docker compose up -d admin-web nginx
```

### Just MongoDB (minimal — for seeding and Compass)

```bash
docker compose up -d mongodb
```

---

## Seed MongoDB

After the stack is running, seed demo data:

```bash
docker compose exec core-api pnpm run seed:mongo
```

Expected output inside container:

```
Seeded MongoDB demo data into one database.
```

Verify from host:

```bash
docker exec mma301_assignment-mongodb-1 mongosh "mongodb://localhost:27017/lms-db" --eval "db.stats()"
# collections: 23, objects: 244
```

---

## Service URLs

| Service | URL |
|---|---|
| admin-web (via nginx) | http://localhost |
| admin-web (direct) | http://localhost:3000 |
| auth-service | http://localhost:3001 |
| core-api | http://localhost:3002 |
| MongoDB | mongodb://localhost:27017 |
| Redis | redis://localhost:6379 |
| LocalStack S3 | http://localhost:4566 |
| Mock Cognito | http://localhost:9229 |
| notification gRPC | localhost:50052 |

---

## Optional SQL Stack

Start Postgres + pgAdmin (not part of the default stack):

```bash
docker compose --profile sql up -d postgres pgadmin
```

pgAdmin access:

```
URL:      http://localhost:5050
Email:    admin@example.com
Password: admin
```

Register server in pgAdmin:

```
Host:     postgres
Port:     5432
Database: lms-core-db
Username: postgres
Password: postgres
```

---

## Container Overview

| Container name | Image | Internal port |
|---|---|---|
| `mma301_assignment-mongodb-1` | `mongo:6.0` | 27017 |
| `mma301_assignment-redis-1` | `redis:7-alpine` | 6379 |
| `mma301_assignment-localstack-1` | `localstack/localstack:3.8.1` | 4566 |
| `mma301_assignment-mock-cognito-1` | `jagregory/cognito-local:latest` | 9229 |
| `mma301_assignment-auth-service-1` | Built from `auth-service/Dockerfile` | 3001, 50051 |
| `mma301_assignment-core-api-1` | Built from `core-api/Dockerfile` | 3002 |
| `mma301_assignment-worker-1` | Built from `worker/Dockerfile` | — |
| `mma301_assignment-notification-svc-1` | Built from `notification-svc/Dockerfile` | 50051 (host: 50052) |
| `mma301_assignment-admin-web-1` | Built from `admin-web/Dockerfile` | 3000 |
| `mma301_assignment-nginx-1` | `nginx:alpine` | 80 |
| `mma301_assignment-postgres-1` *(profile: sql)* | `postgres:15-alpine` | 5432 |
| `mma301_assignment-pgadmin-1` *(profile: sql)* | `dpage/pgadmin4:8` | 5050 |

---

## Volumes

Docker Compose creates named volumes to persist data across restarts:

| Volume | Used by |
|---|---|
| `mma301_assignment_mongodb_data` | MongoDB data directory |
| `mma301_assignment_redis_data` | Redis persistence |
| `mma301_assignment_localstack_data` | LocalStack S3 bucket data |
| `mma301_assignment_postgres_data` | PostgreSQL data |
| `mma301_assignment_pgadmin_data` | pgAdmin configuration |

---

## Useful Commands

```bash
# Check container status
docker compose ps

# Follow logs for a service
docker compose logs -f core-api
docker compose logs -f mongodb

# Execute a command inside a container
docker compose exec core-api sh
docker compose exec core-api pnpm run seed:mongo

# Direct exec with docker (use container name)
docker exec mma301_assignment-mongodb-1 mongosh "mongodb://localhost:27017/lms-db" --eval "db.stats()"

# Restart a single service
docker compose restart core-api

# Rebuild a single service (after code changes)
docker compose up -d --build core-api
```

---

## Stop and Reset

```bash
# Stop all running containers
docker compose down

# Stop and remove named volumes (full data reset)
docker compose down -v

# Stop only specific services
docker compose stop mongodb redis
```

After `docker compose down -v`, re-seed when you bring the stack back up:

```bash
docker compose up -d mongodb
pnpm seed
# or
docker compose up -d --build
docker compose exec core-api pnpm run seed:mongo
```

---

## Environment Variables in Docker

All environment variables for Docker services are defined directly in `docker-compose.yml`.
The key difference from local setup is that service names are used as hostnames instead of `localhost`:

| Variable | Local value | Docker value |
|---|---|---|
| `MONGO_URI` | `mongodb://localhost:27017/lms-db` | `mongodb://mongodb:27017/lms-db` |
| `REDIS_URI` | `redis://localhost:6379` | `redis://redis:6379` |
| `AUTH_SERVICE_GRPC_HOST` | `localhost:50051` | `auth-service:50051` |
| `COGNITO_ENDPOINT` | `http://localhost:9229` | `http://mock-cognito:9229` |
