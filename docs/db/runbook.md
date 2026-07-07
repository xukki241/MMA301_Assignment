# Database Runbook

## Start Local Stack

```bash
docker compose up --build
```

## pgAdmin

Open:

```text
http://localhost:5050
```

Login:

```text
Email: admin@example.com
Password: admin
```

Register PostgreSQL server in pgAdmin:

```text
Host: postgres
Port: 5432
Database: lms-core-db
Username: postgres
Password: postgres
```

## PostgreSQL Migration

Run from host:

```bash
cd core-api
npm run db:generate
npm run db:migrate
```

Run inside Docker:

```bash
docker compose exec core-api npm run db:generate
docker compose exec core-api npm run db:migrate
```

## PostgreSQL Seed

Run from host:

```bash
cd core-api
npm run seed:prisma
```

Run inside Docker:

```bash
docker compose exec core-api npm run seed:prisma
```

## MongoDB Seed

Run the single Mongo seed from `core-api`. It seeds both `lms-auth-db` and `lms-core-db`.

```bash
cd core-api
npm run seed:mongo
```

Inside Docker:

```bash
docker compose exec core-api npm run seed:mongo
```

## Demo Credentials

All demo users use:

```text
Password123!
```

Primary users:

```text
admin@example.com
teacher@example.com
student@example.com
```

Medium demo users:

```text
teacher1@example.com ... teacher5@example.com
student1@example.com ... student14@example.com
```

## Reset Notes

The seed scripts use `reset-dev` behavior. They remove only deterministic demo records, not arbitrary production-like data.

Do not run these commands against production databases.
