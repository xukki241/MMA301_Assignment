# Seed Data Reference

Complete reference for all demo data created by `pnpm seed` (`core-api/src/scripts/seedMongo.ts`).

---

## Overview

| Entity | Count | Database |
|---|---|---|
| Roles | 3 | `lms-db` |
| Users | 22 | `lms-db` |
| UserRoles | 22 | `lms-db` |
| Classes | 5 | `lms-db` |
| ClassSettings | 5 | `lms-db` |
| Enrollments | 30 | `lms-db` |
| Topics | 10 | `lms-db` |
| Materials | 10 | `lms-db` |
| Exercises | 10 | `lms-db` |
| Submissions | 6 | `lms-db` |
| SubmissionFiles | 6 | `lms-db` |
| Grades | 6 | `lms-db` |
| PrivateNotes | 6 | `lms-db` |
| AttendanceLogs | 30 | `lms-db` |
| StudentPerformanceMetrics | 30 | `lms-db` |
| AlertThresholds | 15 | `lms-db` |
| ClassPosts | 5 | `lms-db` |
| PostComments | 5 | `lms-db` |
| QuizBanks | 5 | `lms-db` |
| Notifications | 8 | `lms-db` |
| DeviceTokens | 3 | `lms-db` |
| AlertLogs | 1 | `lms-db` |
| SystemLogs | 1 | `lms-db` |

All data is seeded into a single database: **`lms-db`**

Seed timestamp: `2026-07-07T00:00:00.000Z`

---

## Roles

| `_id` | `roleName` |
|---|---|
| `64a000000000000000000001` | Admin |
| `64a000000000000000000002` | Teacher |
| `64a000000000000000000003` | Student |

---

## Users

Password for all users: `Password123!`

### Primary accounts

| `_id` | Email | Full Name | Role |
|---|---|---|---|
| `64b000000000000000000001` | `admin@example.com` | Demo Admin | Admin |
| `64b000000000000000000002` | `teacher@example.com` | Primary Demo Teacher | Teacher |
| `64b000000000000000000003` | `student@example.com` | Primary Demo Student | Student |

### Extended teacher accounts

| `_id` | Email | Full Name |
|---|---|---|
| `64b000000000000000000011` | `teacher1@example.com` | Demo Teacher 1 |
| `64b000000000000000000012` | `teacher2@example.com` | Demo Teacher 2 |
| `64b000000000000000000013` | `teacher3@example.com` | Demo Teacher 3 |
| `64b000000000000000000014` | `teacher4@example.com` | Demo Teacher 4 |
| `64b000000000000000000015` | `teacher5@example.com` | Demo Teacher 5 |

### Extended student accounts

| `_id` | Email |
|---|---|
| `64b000000000000000000101` | `student1@example.com` |
| `64b000000000000000000102` | `student2@example.com` |
| `64b000000000000000000103` | `student3@example.com` |
| … | … |
| `64b00000000000000000010e` | `student14@example.com` |

---

## Classes

| `_id` | `name` | `classCode` | Teacher email |
|---|---|---|---|
| `64c000000000000000000001` | MMA301 Analytics Foundations | LMS101 | teacher1@example.com |
| `64c000000000000000000002` | Backend Systems for LMS | LMS102 | teacher2@example.com |
| `64c000000000000000000003` | Mobile Learning Experience | LMS103 | teacher3@example.com |
| `64c000000000000000000004` | Data Engineering for Education | LMS104 | teacher4@example.com |
| `64c000000000000000000005` | Assessment and Feedback | LMS105 | teacher5@example.com |

All classes have `status: "active"`.

---

## Enrollments

6 students per class (overlapping). Assignment pattern:

| Class | Students |
|---|---|
| LMS101 | student1–student6 |
| LMS102 | student3–student8 |
| LMS103 | student5–student10 |
| LMS104 | student7–student12 |
| LMS105 | student9–student14 |

All enrollments: `status: "enrolled"`.

---

## Topics

2 topics per class:

| Class | Topic 1 | Topic 2 |
|---|---|---|
| LMS101 | Getting Started | Applied Practice |
| LMS102 | Getting Started | Applied Practice |
| LMS103 | Getting Started | Applied Practice |
| LMS104 | Getting Started | Applied Practice |
| LMS105 | Getting Started | Applied Practice |

---

## Materials and Exercises

Per topic: 1 PDF material + 1 assignment exercise.

- Material file URL pattern: `s3://lms-uploads/materials/{classCode}-{topicIndex}.pdf`
- Exercise due date: topic 1 = 7 days after seed date, topic 2 = 14 days after
- Max points: 100

---

## Submissions, Grades, and Private Notes

Seeded **only for class LMS101, topic 1** (6 students):

| Student | Points | Status |
|---|---|---|
| student1 | 70 | graded |
| student2 | 74 | graded |
| student3 | 78 | graded |
| student4 | 82 | graded |
| student5 | 86 | graded |
| student6 | 90 | graded |

Each submission has: a SubmissionFile, a Grade record, and a PrivateNote from the teacher.

---

## Attendance Logs

One log per student per class (30 total).

Pattern: every 5th student in the class is marked `late`, the rest are `present`.

---

## Student Performance Metrics

One metrics record per student per class (30 total):

| Metric | Base value | Per-student increment |
|---|---|---|
| `attendanceRate` | 82 | +1 per student index |
| `assignmentCompletionRate` | 78 | +1 per student index |
| `averageGrade` | 72 | +3 per student index |
| `riskLevel` | Good | Warning if student index > 4 |

---

## Alert Thresholds

3 per class (15 total):

| Type | Threshold | Severity |
|---|---|---|
| `attendance` | 75% | medium |
| `grades` | 60% | high |
| `submissions` | 80% | low |

---

## Notifications

8 notifications for `student1` through `student8`.

Type: `general`, `isRead: false`

---

## Device Tokens

3 tokens for `student1`, `student2`, `student3`:

| Student | Device type |
|---|---|
| student1 | web |
| student2 | ios |
| student3 | android |

---

## Alert Log

1 alert log for class LMS101, student1:

```json
{
  "alertType": "grades",
  "message": "Seeded grade alert",
  "severity": "medium",
  "status": "unread"
}
```

---

## System Log

1 system log entry verifying the seed completed:

```json
{
  "serviceName": "seed-mongo",
  "level": "info",
  "message": "Seeded MongoDB full demo data",
  "metadata": { "mode": "reset-dev" }
}
```

Verify in Compass or mongosh:

```js
db.systemlogs.find({ serviceName: "seed-mongo" })
```

---

## Re-seed Behavior

The seed script deletes then recreates all records listed above using **fixed deterministic ObjectIds**.
Records outside those ID ranges are untouched.

Safe to run multiple times.
