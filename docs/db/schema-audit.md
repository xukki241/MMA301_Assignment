# Schema Audit

## Decision

MongoDB is the primary runtime datastore. PostgreSQL is kept as a secondary relational model for future SQL-backed development, reporting, and ERD work.

## MongoDB Runtime Schemas

### `auth-service` database: `lms-auth-db`

Collections:

* `users`: email, password hash, full name, avatar URL, Cognito subject, active flag, timestamps.
* `roles`: role name and created timestamp.
* `userroles`: many-to-many join between users and roles using Mongo ObjectId references.

### `core-api` database: `lms-core-db`

Collections:

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

## PostgreSQL / Prisma Schema

`core-api/prisma/schema.prisma` models the same auth and LMS domain in relational form:

* `User`
* `Role`
* `UserRole`
* `Class`
* `Enrollment`
* `Topic`
* `Material`
* `Exercise`
* `Submission`
* `SubmissionFile`
* `Grade`
* `AttendanceLog`
* `AlertThreshold`
* `StudentPerformanceMetrics`
* `AlertLog`
* `ClassPost`
* `PostComment`
* `PrivateNote`
* `Notification`
* `SystemLog`
* `ClassSettings`
* `DeviceToken`
* `QuizBank`

## Important Differences

* MongoDB stores auth users and roles in `lms-auth-db`; LMS domain data is in `lms-core-db`.
* PostgreSQL stores the matching auth and LMS tables in one relational schema.
* MongoDB uses deterministic ObjectId values for demo records; PostgreSQL uses the same values as text IDs so seeded records can be compared directly.
* MongoDB is the source of truth for current app behavior. PostgreSQL migration and seed mirror the same demo data for future SQL development and inspection.

## Seed Policy

The approved seed mode is `reset-dev`:

* `core-api` has exactly two seed entrypoints: `npm run seed:mongo` and `npm run seed:prisma`.
* Mongo seed removes and recreates deterministic demo users, roles, role links, and LMS records.
* Postgres seed removes and recreates the matching deterministic demo users, roles, role links, and LMS records.
* No seed script is intended for production data.
