# Schema Audit

## Decision

MongoDB is the current runtime datastore. The project uses one shared database for every runtime collection:

```text
lms-db
```

PostgreSQL and Prisma remain in the repository as an optional secondary schema for inspection and future SQL-backed work. They are not part of the default runtime path.

## Shared MongoDB Runtime Schema

Auth collections:

* `users`: email, password hash, full name, avatar URL, Cognito subject, active flag, timestamps.
* `roles`: role name and created timestamp.
* `userroles`: many-to-many join between users and roles using Mongo ObjectId references.

LMS domain collections:

* `classes`: class metadata, class code, teacher user id, status.
* `enrollments`: class-to-student membership.
* `topics`: ordered class topics.
* `materials`: topic learning materials and file metadata.
* `exercises`: topic assignments.
* `submissions`: student exercise submissions.
* `submissionfiles`: submitted file metadata.
* `grades`: submission grade records.
* `classposts`: class stream posts.
* `postcomments`: comments on class stream posts.
* `privatenotes`: teacher/student private submission notes.
* `notifications`: user notifications.
* `alertlogs`: student risk or status alerts.
* `alertthresholds`: class-level alert thresholds.
* `attendancelogs`: per-class student attendance records.
* `studentperformancemetrics`: denormalized metrics for dashboards and alerts.
* `systemlogs`: operational logs.
* `classsettings`: per-class settings.
* `devicetokens`: push/web device tokens.
* `quizbanks`: reusable quiz question banks.

## Seed Policy

The approved seed mode is `reset-dev`:

* `core-api` has one database seed entrypoint: `pnpm run seed:mongo`.
* Mongo seed removes and recreates deterministic demo users, roles, role links, and LMS records in `lms-db`.
* The retained SQL mirror is refreshed only by explicit optional commands: `pnpm run db:generate`, `pnpm run db:migrate`, and `pnpm run seed:prisma` from `core-api` or the matching root Turbo scripts.
* No seed script is intended for production data.
