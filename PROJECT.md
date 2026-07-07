# Project: EdTech LMS Database ERD Generation

## Architecture
- PostgreSQL Schema: Relational schema defined in `core-api/prisma/schema.prisma` consisting of 20 tables.
- MongoDB Schema: Document schema defined across Mongoose models in `auth-service/src/models/` and `core-api/src/models/index.ts` consisting of 23 collections.
- Layout and Relations: All models represented as tables/collections in DBML and DrawDB formats, complete with primary keys, fields, data types, distinct visual coloring, and relational constraints.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | PostgreSQL ERD | Parse Prisma schema and write `postgres-lms.dbml` & `postgres-lms.drawdb.json` | None | DONE |
| 2 | MongoDB ERD | Parse Mongoose models and write `mongo-lms.dbml` & `mongo-lms.drawdb.json` | None | DONE |
| 3 | Final Review | Validate syntax and completeness of all generated DBML and drawdb JSON files | M1, M2 | DONE |

## Code Layout
- `docs/erd/postgres-lms.dbml`
- `docs/erd/postgres-lms.drawdb.json`
- `docs/erd/mongo-lms.dbml`
- `docs/erd/mongo-lms.drawdb.json`
