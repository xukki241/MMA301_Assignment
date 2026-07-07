# Project: EdTech LMS MongoDB ERD

## Architecture

* Current runtime database: MongoDB.
* Shared database name: `lms-db`.
* Retained secondary schema: PostgreSQL/Prisma for inspection, ERD work, and future SQL-backed development.
* MongoDB schema: document schema defined across Mongoose models in `auth-service/src/models/` and `core-api/src/models/index.ts`.
* Layout and relations: models represented as collections in DBML and DrawDB formats with primary fields, data types, visual coloring, and reference relationships.

## Milestones

| # | Name | Scope | Status |
|---|---|---|---|
| 1 | MongoDB ERD | Parse Mongoose models and write Mongo DBML / DrawDB artifacts | DONE |
| 2 | Runtime DB Focus | Keep PostgreSQL/Prisma optional while making MongoDB the current runtime path | DONE |

## Code Layout

* `docs/erd/mongo-lms.dbml`
* `docs/erd/mongo-lms.drawdb.json`
* `docs/erd/postgres-lms.dbml`
* `docs/erd/postgres-lms.drawdb.json`
