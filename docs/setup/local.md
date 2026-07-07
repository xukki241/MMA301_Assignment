# Local Development Setup

Detailed guide for running the LMS platform with application services on the **host machine** and infrastructure (MongoDB, Redis, etc.) running in **Docker**.

---

## Prerequisites

Install these tools before proceeding:

| Tool | Version | Install |
|---|---|---|
| Node.js | 18 LTS+ | https://nodejs.org |
| pnpm | 9.x | `npm install -g pnpm` |
| Docker Desktop | 4.x+ | https://www.docker.com/products/docker-desktop |
| MongoDB Compass | Latest | https://www.mongodb.com/products/compass |

---

## Windows-Specific: Stop Local MongoDB Service

If you have MongoDB installed locally on Windows, it will conflict with the Docker MongoDB container on port 27017.

**Stop and disable the Windows MongoDB service before proceeding:**

1. Press `Win + R` → type `services.msc` → Enter
2. Find **MongoDB Server (MongoDB)**
3. Right-click → **Stop**
4. Right-click → **Properties** → Startup type: **Disabled** → OK

Verify the fix:

```powershell
netstat -ano | findstr ":27017"
# Should show only ONE listening process (Docker)
Get-Service -Name MongoDB
# Status should be: Stopped
```

---

## Step 1 — Start Infrastructure Containers

```bash
docker compose up -d mongodb redis localstack mock-cognito
```

Verify all four containers are running:

```bash
docker compose ps
```

Expected output:

```
NAME                                  STATUS
mma301_assignment-mongodb-1           Up
mma301_assignment-redis-1            Up
mma301_assignment-localstack-1       Up
mma301_assignment-mock-cognito-1     Up
```

---

## Step 2 — Install Dependencies

From the workspace root:

```bash
pnpm install
# Windows (if pnpm is blocked)
pnpm.cmd install
```

---

## Step 3 — Create `.env` Files

### `auth-service/.env`

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

### `core-api/.env`

```env
PORT=3002
MONGO_URI=mongodb://localhost:27017/lms-db
REDIS_URI=redis://localhost:6379
AUTH_SERVICE_GRPC_HOST=localhost:50051
```

### `notification-svc/.env`

```env
PORT=50051
MONGO_URI=mongodb://localhost:27017/lms-db
```

### `worker/.env`

```env
MONGO_URI=mongodb://localhost:27017/lms-db
REDIS_URI=redis://localhost:6379
NOTIFICATION_SVC_GRPC=localhost:50052
```

---

## Step 4 — Seed MongoDB

```bash
pnpm seed
# Windows
pnpm.cmd seed
```

Or explicitly:

```bash
pnpm --filter core-api run seed:mongo
```

Expected output:

```
Seeded MongoDB demo data into one database.
```

Verify:

```bash
docker exec mma301_assignment-mongodb-1 mongosh "mongodb://localhost:27017/lms-db" --eval "db.stats()"
```

Expected: `collections: 23, objects: 244`

---

## Step 5 — Start Application Services

Open separate terminals for each service, or use Turbo to run them all:

### Option A — Separate terminals

```bash
# Terminal 1
pnpm --filter auth-service dev

# Terminal 2
pnpm --filter core-api dev

# Terminal 3
pnpm --filter notification-svc dev

# Terminal 4
pnpm --filter worker dev

# Terminal 5
pnpm --filter admin-web dev

# Terminal 6 (optional)
pnpm --filter mobile-app dev
```

### Option B — Turbo parallel

```bash
pnpm dev
```

---

## Step 6 — Verify Running Services

| Service | URL |
|---|---|
| admin-web | http://localhost:3000 |
| auth-service REST | http://localhost:3001 |
| core-api REST | http://localhost:3002 |
| auth gRPC | localhost:50051 |
| notification gRPC | localhost:50052 |
| Redis | localhost:6379 |
| MongoDB | localhost:27017 |
| LocalStack (S3) | http://localhost:4566 |
| Mock Cognito | http://localhost:9229 |

---

## Optional — SQL Tooling

Start only when you need to inspect the retained PostgreSQL/Prisma schema:

```bash
docker compose --profile sql up -d postgres pgadmin
```

Apply schema and seed:

```bash
pnpm db:migrate
pnpm seed:prisma
```

pgAdmin: http://localhost:5050 (admin@example.com / admin)

---

## Stop Everything

```bash
# Stop infrastructure containers
docker compose down

# Remove volumes (full reset)
docker compose down -v
```

Stop host services with `Ctrl+C` in each terminal.
