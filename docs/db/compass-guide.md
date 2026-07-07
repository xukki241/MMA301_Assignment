# MongoDB Compass Guide

Step-by-step guide to connecting MongoDB Compass to the local Docker MongoDB instance, browsing seed data, and running useful queries.

---

## 1. Connect to Docker MongoDB

Open **MongoDB Compass** and use the connection string:

```
mongodb://localhost:27017
```

Click **Connect**.

> ### Windows: Port Conflict Warning
>
> If the sidebar shows **only** `admin`, `config`, and `local` databases — and no `lms-db` — you are connected to the **MongoDB Windows Service** on your machine, not the Docker container.
>
> **Fix:**
> 1. Open `services.msc`
> 2. Find **MongoDB Server (MongoDB)**
> 3. Right-click → **Stop**
> 4. Properties → Startup type: **Disabled**
> 5. Reconnect Compass to `localhost:27017`
> 6. Re-run `pnpm seed`

---

## 2. Navigate to Seed Data

After connecting, the left sidebar shows:

```
localhost:27017
├── admin
├── config
├── lms-db          ← your seed data
│   ├── alertlogs
│   ├── alertthresholds
│   ├── attendancelogs
│   ├── classes
│   ├── classposts
│   ├── classsettings
│   ├── devicetokens
│   ├── enrollments
│   ├── exercises
│   ├── grades
│   ├── materials
│   ├── notifications
│   ├── postcomments
│   ├── privatenotes
│   ├── quizbanks
│   ├── studentperformancemetrics
│   ├── submissions
│   ├── submissionfiles
│   ├── systemlogs
│   ├── topics
│   ├── userroles
│   └── users
└── local
```

Click any collection to open it.

---

## 3. Documents Tab — Browse and Filter

The **Documents** tab is the main view. It has four input boxes in the toolbar:

```
FILTER { }  |  PROJECT { }  |  SORT { }  |  LIMIT 20
```

### FILTER — filter documents

Leave empty `{}` to return all documents, or use MQL:

**All documents:**
```json
{}
```

**Exact match:**
```json
{ "status": "active" }
```

**Multiple conditions (AND):**
```json
{ "status": "active", "classCode": "LMS101" }
```

**OR condition:**
```json
{ "$or": [{ "status": "active" }, { "status": "archived" }] }
```

**Comparison operators:**
```json
{ "points": { "$gte": 80 } }
```

| Operator | Meaning |
|---|---|
| `$gte` | ≥ |
| `$lte` | ≤ |
| `$gt` | > |
| `$lt` | < |
| `$ne` | ≠ |
| `$in` | in array |

### SORT — sort results

Newest first:
```json
{ "createdAt": -1 }
```

Highest grade first:
```json
{ "points": -1 }
```

`-1` = descending, `1` = ascending.

### PROJECT — select fields to display

Show only `name`, `classCode`, hide `_id`:
```json
{ "name": 1, "classCode": 1, "_id": 0 }
```

`1` = include, `0` = exclude.

---

## 4. Practical Filter Examples by Collection

### `classes`

| Goal | Filter |
|---|---|
| All classes | `{}` |
| Active classes | `{ "status": "active" }` |
| Find by code | `{ "classCode": "LMS101" }` |
| Archived | `{ "status": "archived" }` |

### `users`

| Goal | Filter |
|---|---|
| All users | `{}` |
| Find by email | `{ "email": "teacher1@example.com" }` |
| Active users only | `{ "isActive": true }` |

### `enrollments`

| Goal | Filter |
|---|---|
| All enrolled | `{ "status": "enrolled" }` |
| Dropped students | `{ "status": "dropped" }` |

### `grades`

| Goal | Filter | Sort |
|---|---|---|
| All grades | `{}` | `{ "points": -1 }` |
| High grades (≥80) | `{ "points": { "$gte": 80 } }` | `{ "points": -1 }` |
| Low grades (<60) | `{ "points": { "$lt": 60 } }` | `{ "points": 1 }` |

### `attendancelogs`

| Goal | Filter |
|---|---|
| Late arrivals | `{ "status": "late" }` |
| Absent records | `{ "status": "absent" }` |
| Present records | `{ "status": "present" }` |

### `studentperformancemetrics`

| Goal | Filter |
|---|---|
| At-risk students | `{ "riskLevel": "Warning" }` |
| Good standing | `{ "riskLevel": "Good" }` |
| Low attendance | `{ "attendanceRate": { "$lt": 80 } }` |

### `alertlogs`

| Goal | Filter |
|---|---|
| Unread alerts | `{ "status": "unread" }` |
| High severity | `{ "severity": "high" }` |

### `systemlogs`

| Goal | Filter |
|---|---|
| Verify seed ran | `{ "serviceName": "seed-mongo" }` |
| Errors only | `{ "level": "error" }` |

---

## 5. Schema Tab

Click the **Schema** tab on any collection.

Compass analyzes the first 1,000 documents and shows:
- Field names and inferred types
- Value distribution (histogram for numbers, bar chart for strings)
- Percentage of documents where field exists (for optional fields)

Useful for verifying that seed data matches the expected schema.

---

## 6. Aggregations Tab

The **Aggregations** tab provides a GUI pipeline builder.

Example pipeline — student count per class:

```
Stage 1: $group
{
  _id: "$classId",
  count: { $sum: 1 }
}
```

Example — average grade:

```
Stage 1: $group
{
  _id: null,
  avgPoints: { $avg: "$points" },
  maxPoints: { $max: "$points" }
}
```

You can export the resulting pipeline as JavaScript or Python code using the **Export pipeline** button.

---

## 7. Mongosh Shell Tab

Click **Open MongoDB shell** (top-right of any collection view).

```js
// Switch to lms-db
use lms-db

// Database overview
db.stats()

// Count per collection
db.classes.countDocuments()
db.enrollments.countDocuments()
db.grades.countDocuments()

// All classes
db.classes.find().pretty()

// Enrollments for a specific class
db.enrollments.find({ classId: ObjectId("64c000000000000000000001") })

// Student count per class
db.enrollments.aggregate([
  { $group: { _id: "$classId", count: { $sum: 1 } } }
])

// Average and max grade
db.grades.aggregate([
  { $group: { _id: null, avg: { $avg: "$points" }, max: { $max: "$points" } } }
])

// High-risk students with their class
db.studentperformancemetrics.find({ riskLevel: "Warning" }).pretty()

// Verify seed completed
db.systemlogs.find({ serviceName: "seed-mongo" })
```

---

## 8. Indexes Tab

Click **Indexes** on any collection to see existing indexes.

Key indexes in the seed data:
- `users.email` — unique index
- `userroles` — compound index `{userId, roleId}` unique
- `classsettings.classId` — unique
- `classes.classCode` — unique

Use this tab to detect missing indexes when queries are slow.
