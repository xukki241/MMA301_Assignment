# Database Runbook

Operational reference for managing the MongoDB runtime database, optional SQL tooling, and seed data lifecycle.

---

## Database Decision

The project uses **MongoDB** as the current runtime database.
All auth and LMS collections live in one shared database:

```
lms-db   (mongodb://localhost:27017/lms-db)
```

PostgreSQL, pgAdmin, Prisma migrations, and Prisma seeds are **retained as optional secondary schema tooling**.
They are not required for the default runtime setup.

---

## Start Local Infrastructure

Start only the required backing services:

```bash
docker compose up -d mongodb redis localstack mock-cognito
```

Verify containers are running:

```bash
docker compose ps
```

---

## Start Optional SQL Tooling

```bash
docker compose --profile sql up -d postgres pgadmin
```

pgAdmin access:

```
URL:      http://localhost:5050
Email:    admin@example.com
Password: admin
```

Register the PostgreSQL server inside pgAdmin (**Add New Server**):

```
Name:     lms-local  (or any label)
Host:     postgres
Port:     5432
Database: lms-core-db
Username: postgres
Password: postgres
```

---

## Start Full Docker Stack

```bash
docker compose up --build
# detached
docker compose up -d --build
```

---

## Seed MongoDB

### From workspace root (preferred)

```bash
pnpm seed
# Windows
pnpm.cmd seed
```

### From `core-api` package

```bash
pnpm --filter core-api run seed:mongo
# Windows
pnpm.cmd --filter core-api run seed:mongo
```

### Inside Docker (when full stack is running)

```bash
docker compose exec core-api pnpm run seed:mongo
```

### Expected result

```
Seeded MongoDB demo data into one database.
```

Verify via container:

```bash
docker exec mma301_assignment-mongodb-1 mongosh "mongodb://localhost:27017/lms-db" --eval "db.stats()"
# collections: 23, objects: 244
```

---

## Optional PostgreSQL Schema Commands

Run only when maintaining the retained SQL mirror:

```bash
pnpm db:generate    # regenerate Prisma client from schema
pnpm db:migrate     # apply migrations to lms-core-db
pnpm seed:prisma    # seed SQL demo data
```

---

## Demo Credentials

All seeded demo users share:

```
Password123!
```

Primary accounts:

```
admin@example.com     Admin
teacher@example.com   Teacher
student@example.com   Student
```

Extended accounts:

```
teacher1@example.com … teacher5@example.com    Teacher
student1@example.com … student14@example.com   Student
```

---

## Reset / Re-seed

The seed script uses `reset-dev` behavior:

- Removes **only** deterministic demo records identified by fixed ObjectId ranges
- Does **not** touch records outside those ranges
- Safe to run multiple times

```bash
pnpm seed
```

Full infrastructure reset (destroys all volumes):

```bash
docker compose down -v
docker compose up -d mongodb redis localstack mock-cognito
pnpm seed
```

---

## Reset Notes

- Do not run the seed command against production databases.
- The `reset-dev` seed mode only targets ObjectId ranges `64a…` through `664…`.
- Collections are cleared per-class or per-id-range, not truncated entirely.

---

## Useful mongosh Queries

```js
use lms-db

// Database summary
db.stats()

// Show all collections
show collections

// Count documents per collection
db.classes.countDocuments()
db.enrollments.countDocuments()
db.grades.countDocuments()

// All active classes
db.classes.find({ status: "active" }).pretty()

// Students enrolled in LMS101
db.enrollments.find({ classId: ObjectId("64c000000000000000000001") })

// Grades above 80
db.grades.find({ points: { $gte: 80 } }).sort({ points: -1 })

// Students at risk
db.studentperformancemetrics.find({ riskLevel: "Warning" })

// Verify seed log entry
db.systemlogs.find({ serviceName: "seed-mongo" })
```
