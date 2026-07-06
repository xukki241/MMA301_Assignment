# API Design & Communication Protocols

This document details the interface contracts for the EdTech LMS Platform, including the REST API plans, Socket.IO real-time event definitions, and gRPC protobuf specifications.

---

## 1. REST API Design Plan

### 1.1 Auth Service Endpoints (Port 3001 / Route: `/api/auth/*`)

#### 1.1.1 User Registration
* **Endpoint**: `POST /api/auth/register`
* **Access**: Public
* **Request Body**:
```json
{
  "email": "teacher@lms.edu",
  "password": "StrongPassword123!",
  "fullName": "Jane Doe",
  "role": "Teacher"
}
```
* **Success Response** (`201 Created`):
```json
{
  "message": "User registered successfully",
  "userId": "usr_9a8b7c6d5e",
  "email": "teacher@lms.edu",
  "fullName": "Jane Doe",
  "role": "Teacher"
}
```

#### 1.1.2 User Login
* **Endpoint**: `POST /api/auth/login`
* **Access**: Public
* **Request Body**:
```json
{
  "email": "teacher@lms.edu",
  "password": "StrongPassword123!"
}
```
* **Success Response** (`200 OK`):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "refreshToken": "rft_2b3c4d5e6f...",
  "expiresIn": 3600,
  "user": {
    "userId": "usr_9a8b7c6d5e",
    "email": "teacher@lms.edu",
    "fullName": "Jane Doe",
    "role": "Teacher"
  }
}
```

#### 1.1.3 Token Refresh
* **Endpoint**: `POST /api/auth/refresh`
* **Access**: Public (requires valid Refresh Token)
* **Request Body**:
```json
{
  "refreshToken": "rft_2b3c4d5e6f..."
}
```
* **Success Response** (`200 OK`):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "refreshToken": "rft_new_7a8b9c..."
}
```

#### 1.1.4 Get Profile Info
* **Endpoint**: `GET /api/auth/profile`
* **Access**: Authenticated (JWT)
* **Headers**: `Authorization: Bearer <accessToken>`
* **Success Response** (`200 OK`):
```json
{
  "userId": "usr_9a8b7c6d5e",
  "email": "teacher@lms.edu",
  "fullName": "Jane Doe",
  "avatarURL": "https://s3.localhost.localstack:4566/avatars/usr_9a8b7c6d5e.png",
  "role": "Teacher",
  "createdAt": "2026-07-06T03:30:00Z"
}
```

---

### 1.2 Core API Service Endpoints (Port 3002 / Route: `/api/*`)

#### 1.2.1 Classroom Management

##### Create Class
* **Endpoint**: `POST /api/classes`
* **Access**: Teacher only
* **Request Body**:
```json
{
  "className": "Advanced Web Engineering",
  "subject": "Computer Science",
  "description": "Learn microservices, gRPC, and React Native architectures."
}
```
* **Success Response** (`201 Created`):
```json
{
  "classId": "cls_102030",
  "teacherId": "usr_9a8b7c6d5e",
  "className": "Advanced Web Engineering",
  "subject": "Computer Science",
  "classCode": "AWE829",
  "description": "Learn microservices, gRPC, and React Native architectures.",
  "createdAt": "2026-07-06T03:35:00Z"
}
```

##### Join Class
* **Endpoint**: `POST /api/classes/join`
* **Access**: Student only
* **Request Body**:
```json
{
  "classCode": "AWE829"
}
```
* **Success Response** (`200 OK`):
```json
{
  "enrollmentId": "enr_405060",
  "classId": "cls_102030",
  "studentId": "usr_student01",
  "status": "Active",
  "joinedAt": "2026-07-06T03:40:00Z"
}
```

##### List Enrolled/Taught Classes
* **Endpoint**: `GET /api/classes`
* **Access**: Authenticated
* **Success Response** (`200 OK`):
```json
[
  {
    "classId": "cls_102030",
    "className": "Advanced Web Engineering",
    "subject": "Computer Science",
    "classCode": "AWE829",
    "teacherName": "Jane Doe",
    "activeStudentsCount": 24
  }
]
```

##### Get Class Members List
* **Endpoint**: `GET /api/classes/:classId/members`
* **Access**: Authenticated (Enrolled Students & Teachers of the class)
* **Success Response** (`200 OK`):
```json
{
  "teachers": [
    { "userId": "usr_9a8b7c6d5e", "fullName": "Jane Doe", "email": "teacher@lms.edu" }
  ],
  "students": [
    { "userId": "usr_student01", "fullName": "Bob Smith", "email": "bob@lms.edu", "status": "Active" }
  ]
}
```

##### Update Class Settings
* **Endpoint**: `PUT /api/classes/:classId/settings`
* **Access**: Teacher only
* **Request Body**:
```json
{
  "allowStudentPosts": true,
  "enableGradeAutoAlerts": true,
  "themeColor": "#3F51B5"
}
```
* **Success Response** (`200 OK`):
```json
{
  "classId": "cls_102030",
  "allowStudentPosts": true,
  "enableGradeAutoAlerts": true,
  "themeColor": "#3F51B5"
}
```

---

#### 1.2.2 Topic & Material Management

##### Get Class Topics List
* **Endpoint**: `GET /api/classes/:classId/topics`
* **Access**: Authenticated
* **Success Response** (`200 OK`):
```json
[
  {
    "topicId": "tpc_001",
    "title": "Module 1: Microservices Basics",
    "orderIndex": 1,
    "materials": [
      {
        "materialId": "mat_101",
        "title": "Introduction to gRPC and Protocol Buffers PDF",
        "contentText": "Read chapters 1 and 2 from the lecture slides.",
        "attachmentURL": "https://s3.localhost.localstack:4566/materials/intro_grpc.pdf"
      }
    ]
  }
]
```

##### Create Class Topic
* **Endpoint**: `POST /api/classes/:classId/topics`
* **Access**: Teacher only
* **Request Body**:
```json
{
  "title": "Module 2: Containerization & Cloud Native",
  "orderIndex": 2
}
```
* **Success Response** (`201 Created`):
```json
{
  "topicId": "tpc_002",
  "classId": "cls_102030",
  "title": "Module 2: Containerization & Cloud Native",
  "orderIndex": 2
}
```

##### Upload & Link Material to Topic
* **Endpoint**: `POST /api/topics/:topicId/materials`
* **Access**: Teacher only
* **Request Body**:
```json
{
  "title": "Docker-Compose Cheatsheet",
  "contentText": "Guide for setting up multi-container orchestrations.",
  "attachmentURL": "https://s3.localhost.localstack:4566/materials/docker_cheatsheet.pdf"
}
```
* **Success Response** (`201 Created`):
```json
{
  "materialId": "mat_102",
  "topicId": "tpc_002",
  "title": "Docker-Compose Cheatsheet",
  "contentText": "Guide for setting up multi-container orchestrations.",
  "attachmentURL": "https://s3.localhost.localstack:4566/materials/docker_cheatsheet.pdf"
}
```

---

#### 1.2.3 Exercises & Student Submissions

##### Create Assignment/Exercise
* **Endpoint**: `POST /api/classes/:classId/exercises`
* **Access**: Teacher only
* **Request Body**:
```json
{
  "topicId": "tpc_001",
  "title": "Lab 1: gRPC Interface Definition",
  "instructions": "Implement the auth.proto definitions and compile using protoc.",
  "dueDate": "2026-07-15T23:59:59Z",
  "maxPoints": 100,
  "allowedExtensions": ["zip", "rar", "tar.gz"]
}
```
* **Success Response** (`201 Created`):
```json
{
  "exerciseId": "exe_8080",
  "classId": "cls_102030",
  "topicId": "tpc_001",
  "title": "Lab 1: gRPC Interface Definition",
  "instructions": "Implement the auth.proto definitions and compile using protoc.",
  "dueDate": "2026-07-15T23:59:59Z",
  "maxPoints": 100,
  "allowedExtensions": ["zip", "rar", "tar.gz"]
}
```

##### Get Pre-signed Submission S3 Upload URL
* **Endpoint**: `POST /api/exercises/:exerciseId/submissions/presigned-url`
* **Access**: Enrolled Student
* **Request Body**:
```json
{
  "fileName": "assignment1_solution.zip",
  "fileSize": 10485760
}
```
* **Success Response** (`200 OK`):
```json
{
  "uploadUrl": "http://localhost:4566/submissions-bucket/exe_8080/usr_student01-assignment1_solution.zip?AWSAccessKeyId=mock&Expires=1783478900&Signature=mockSignature",
  "filePathUrl": "https://s3.localhost.localstack:4566/submissions-bucket/exe_8080/usr_student01-assignment1_solution.zip"
}
```

##### Finalize Exercise Submission (Metadata persistence)
* **Endpoint**: `POST /api/exercises/:exerciseId/submissions`
* **Access**: Enrolled Student
* **Request Body**:
```json
{
  "fileName": "assignment1_solution.zip",
  "filePathUrl": "https://s3.localhost.localstack:4566/submissions-bucket/exe_8080/usr_student01-assignment1_solution.zip",
  "fileSize": 10485760
}
```
* **Success Response** (`201 Created`):
```json
{
  "submissionId": "sub_445566",
  "exerciseId": "exe_8080",
  "studentId": "usr_student01",
  "status": "OnTime",
  "submittedAt": "2026-07-10T14:20:00Z",
  "files": [
    {
      "fileId": "file_8899",
      "fileName": "assignment1_solution.zip",
      "filePathUrl": "https://s3.localhost.localstack:4566/submissions-bucket/exe_8080/usr_student01-assignment1_solution.zip",
      "fileSize": 10485760
    }
  ]
}
```

##### List Submissions for an Exercise
* **Endpoint**: `GET /api/exercises/:exerciseId/submissions`
* **Access**: Teacher only
* **Success Response** (`200 OK`):
```json
[
  {
    "submissionId": "sub_445566",
    "studentId": "usr_student01",
    "studentName": "Bob Smith",
    "status": "OnTime",
    "submittedAt": "2026-07-10T14:20:00Z",
    "score": null,
    "gradedAt": null
  }
]
```

---

#### 1.2.4 Grading, Feedback & Communication

##### Submit Grade & Feedback
* **Endpoint**: `POST /api/submissions/:submissionId/grades`
* **Access**: Teacher only
* **Request Body**:
```json
{
  "score": 95,
  "feedback": "Excellent architectural approach in the protobuf files. Missing comments in the service."
}
```
* **Success Response** (`200 OK`):
```json
{
  "gradeId": "grd_112233",
  "submissionId": "sub_445566",
  "gradedById": "usr_9a8b7c6d5e",
  "score": 95,
  "feedback": "Excellent architectural approach in the protobuf files. Missing comments in the service.",
  "gradedAt": "2026-07-11T09:00:00Z"
}
```

##### Get Private Submission Notes Thread
* **Endpoint**: `GET /api/submissions/:submissionId/private-notes`
* **Access**: Teacher & Submitting Student
* **Success Response** (`200 OK`):
```json
[
  {
    "noteId": "nte_7788",
    "senderId": "usr_student01",
    "senderName": "Bob Smith",
    "content": "Teacher, did you review the bonus section?",
    "sentAt": "2026-07-11T12:00:00Z"
  },
  {
    "noteId": "nte_7789",
    "senderId": "usr_9a8b7c6d5e",
    "senderName": "Jane Doe",
    "content": "Yes, I gave extra points for Docker integration.",
    "sentAt": "2026-07-11T13:30:00Z"
  }
]
```

##### Post a Private Note
* **Endpoint**: `POST /api/submissions/:submissionId/private-notes`
* **Access**: Teacher & Submitting Student
* **Request Body**:
```json
{
  "content": "Thank you for the clarification!"
}
```
* **Success Response** (`201 Created`):
```json
{
  "noteId": "nte_7790",
  "senderId": "usr_student01",
  "content": "Thank you for the clarification!",
  "sentAt": "2026-07-11T14:00:00Z"
}
```

---

#### 1.2.5 Attendance Tracking

##### Log Session Attendance
* **Endpoint**: `POST /api/classes/:classId/attendance`
* **Access**: Teacher only
* **Request Body**:
```json
{
  "sessionDate": "2026-07-06",
  "records": [
    { "studentId": "usr_student01", "status": "Present" },
    { "studentId": "usr_student02", "status": "Absent" },
    { "studentId": "usr_student03", "status": "Late" }
  ]
}
```
* **Success Response** (`200 OK`):
```json
{
  "message": "Attendance successfully logged",
  "classId": "cls_102030",
  "sessionDate": "2026-07-06",
  "recordsUpdated": 3
}
```

##### Get Class Attendance Logs
* **Endpoint**: `GET /api/classes/:classId/attendance`
* **Access**: Authenticated (Teachers, or students viewing their own attendance)
* **Query Parameters**: `?studentId=usr_student01` (required for students)
* **Success Response** (`200 OK`):
```json
[
  { "sessionDate": "2026-07-06", "status": "Present" },
  { "sessionDate": "2026-07-08", "status": "Late" }
]
```

---

#### 1.2.6 Performance Alerts & Analytics

##### Get Teacher Dashboard Analytics
* **Endpoint**: `GET /api/classes/:classId/metrics`
* **Access**: Teacher only
* **Success Response** (`200 OK`):
```json
{
  "classId": "cls_102030",
  "averageGrade": 82.4,
  "riskDistribution": {
    "Good": 18,
    "Warning": 4,
    "Critical": 2
  },
  "atRiskStudents": [
    {
      "studentId": "usr_student02",
      "fullName": "Alice Johnson",
      "currentAverage": 54.2,
      "missingCount": 4,
      "riskLevel": "Critical"
    }
  ]
}
```

##### List Triggered Performance Alerts
* **Endpoint**: `GET /api/classes/:classId/alerts`
* **Access**: Teacher & student-specific view
* **Success Response** (`200 OK`):
```json
[
  {
    "alertId": "alr_998877",
    "studentId": "usr_student02",
    "studentName": "Alice Johnson",
    "triggeredBy": "OverdueAssignments",
    "message": "Student has 4 missing assignments, exceeding class threshold of 3.",
    "sentAt": "2026-07-05T08:00:00Z",
    "isReadByStudent": false
  }
]
```

##### Bulk Send Notifications to At-Risk Students
* **Endpoint**: `POST /api/classes/:classId/alerts/bulk-notify`
* **Access**: Teacher only
* **Request Body**:
```json
{
  "studentIds": ["usr_student02", "usr_student05"],
  "title": "Academic Review Reminder",
  "message": "Please review your outstanding course deliverables and schedule a tutoring block."
}
```
* **Success Response** (`200 OK`):
```json
{
  "message": "Bulk alert notifications queued for delivery",
  "recipientsCount": 2
}
```

---

#### 1.2.7 Class Stream & Discussions

##### Get Stream Posts
* **Endpoint**: `GET /api/classes/:classId/posts`
* **Access**: Authenticated
* **Success Response** (`200 OK`):
```json
[
  {
    "postId": "pst_12345",
    "author": { "userId": "usr_9a8b7c6d5e", "fullName": "Jane Doe", "role": "Teacher" },
    "content": "Welcome to class everyone! Please verify you can access the syllabus.",
    "createdAt": "2026-07-06T04:00:00Z",
    "comments": [
      {
        "commentId": "cmt_98765",
        "author": { "userId": "usr_student01", "fullName": "Bob Smith", "role": "Student" },
        "content": "Can confirm it opens perfectly. Thank you!",
        "createdAt": "2026-07-06T04:15:00Z"
      }
    ]
  }
]
```

##### Create Stream Post
* **Endpoint**: `POST /api/classes/:classId/posts`
* **Access**: Authenticated (subject to class setting `allowStudentPosts`)
* **Request Body**:
```json
{
  "content": "Does anyone want to form a study group for the gRPC lab?"
}
```
* **Success Response** (`201 Created`):
```json
{
  "postId": "pst_12346",
  "classId": "cls_102030",
  "authorId": "usr_student01",
  "content": "Does anyone want to form a study group for the gRPC lab?",
  "createdAt": "2026-07-06T05:00:00Z"
}
```

##### Create Comment on Post
* **Endpoint**: `POST /api/posts/:postId/comments`
* **Access**: Authenticated
* **Request Body**:
```json
{
  "content": "I'm interested! Let's meet in the Discord server."
}
```
* **Success Response** (`201 Created`):
```json
{
  "commentId": "cmt_98766",
  "postId": "pst_12346",
  "authorId": "usr_student02",
  "content": "I'm interested! Let's meet in the Discord server.",
  "createdAt": "2026-07-06T05:05:00Z"
}
```

---

## 2. Socket.IO Real-time Events (Class Rooms)

Socket.IO enables real-time synchronization of discussion feeds, submission comments, grading updates, and attendance logs.

### 2.1 Connection and Security Setup
* **URL**: `ws://localhost/socket.io/` (served at `/socket.io/` reverse-proxied by Nginx to the Core API service)
* **Handshake Authentication**: Clients must transmit a valid JWT access token within the handshake `auth` block:
```javascript
const socket = io("ws://localhost", {
  auth: {
    token: "Bearer eyJhbGciOiJIUzI1NiIsIn..."
  }
}
```
If the token is invalid, missing, or expired, the server terminates the connection with an authentication error.

### 2.2 Client-to-Server Events

#### Join Class Room
* **Event**: `join_class`
* **Purpose**: Instructs the server to subscribe the socket session to the target class's event feed.
* **Payload**:
```json
{
  "classId": "cls_102030"
}
```
* **Server Logic**: The server verifies that the user `{userId}` payload in the socket session is either a student enrolled in `classId` or the assigned teacher. If authorized, the socket joins the room named `class:{classId}`.

---

### 2.3 Server-to-Client Events (Broadcasted to `class:{classId}`)

#### New Post Event
* **Event**: `post:created`
* **Trigger**: A new post is successfully created via REST `POST /api/classes/:classId/posts`
* **Payload**:
```json
{
  "classId": "cls_102030",
  "post": {
    "postId": "pst_12346",
    "author": {
      "userId": "usr_student01",
      "fullName": "Bob Smith",
      "role": "Student"
    },
    "content": "Does anyone want to form a study group for the gRPC lab?",
    "createdAt": "2026-07-06T05:00:00Z"
  }
}
```

#### New Comment Event
* **Event**: `comment:created`
* **Trigger**: A new comment is added via REST `POST /api/posts/:postId/comments`
* **Payload**:
```json
{
  "classId": "cls_102030",
  "comment": {
    "commentId": "cmt_98766",
    "postId": "pst_12346",
    "author": {
      "userId": "usr_student02",
      "fullName": "Alice Johnson",
      "role": "Student"
    },
    "content": "I'm interested! Let's meet in the Discord server.",
    "createdAt": "2026-07-06T05:05:00Z"
  }
}
```

#### Grade Updated Event
* **Event**: `grade:updated`
* **Trigger**: A teacher grades a submission via REST `POST /api/submissions/:submissionId/grades`
* **Scope**: Emitted **only** to the specific student's socket room `user:{studentId}` and the teacher's room to maintain grade confidentiality.
* **Payload**:
```json
{
  "classId": "cls_102030",
  "exerciseId": "exe_8080",
  "grade": {
    "gradeId": "grd_112233",
    "submissionId": "sub_445566",
    "score": 95,
    "feedback": "Excellent architectural approach in the protobuf files.",
    "gradedAt": "2026-07-11T09:00:00Z"
  }
}
```

#### Attendance Logged Event
* **Event**: `attendance:logged`
* **Trigger**: A teacher logs class attendance via REST `POST /api/classes/:classId/attendance`
* **Payload**:
```json
{
  "classId": "cls_102030",
  "sessionDate": "2026-07-06"
}
```

---

## 3. gRPC Protobuf Definitions

Protobuf files are maintained in the `proto/` directory at the repository root.

### 3.1 Auth Service Definition (`proto/auth.proto`)
Coordinates JWT verification and user identity loading between the Core API Service (client) and the Auth Service (server).

```protobuf
syntax = "proto3";

package auth;

option go_package = "./auth";
option objc_class_prefix = "LMSAUTH";

// The authentication and user management service
service AuthService {
  // Validate token sent in client request headers
  rpc ValidateToken (TokenRequest) returns (TokenResponse);
  
  // Fetch detailed user profile information
  rpc GetUser (UserRequest) returns (UserResponse);
}

// Request containing the JWT access token
message TokenRequest {
  string token = 1; // Expected to contain "Bearer <token>" or raw token
}

// Verification result returned to the client
message TokenResponse {
  bool isValid = 1;
  string userId = 2;
  string email = 3;
  string fullName = 4;
  repeated string roles = 5; // e.g., ["Teacher", "Admin"]
}

// Request to retrieve a user profile by ID
message UserRequest {
  string userId = 1;
}

// User details response
message UserResponse {
  string userId = 1;
  string email = 2;
  string fullName = 3;
  string avatarUrl = 4;
  string role = 5;
  string createdAt = 6; // ISO 8601 string
}
```

### 3.2 Notification Service Definition (`proto/notification.proto`)
Manages downstream notification delivery. Includes a server-side streaming endpoint allowing the Notification Service to maintain a persistent push channel to the Core API / Worker servers.

```protobuf
syntax = "proto3";

package notification;

option go_package = "./notification";
option objc_class_prefix = "LMSNOTIF";

// The notification streaming and delivery service
service NotificationService {
  // Initiates a persistent push stream to dispatch notifications
  rpc StreamNotification (StreamRequest) returns (stream NotificationPayload);
  
  // Sends a single direct push notification message
  rpc SendDirectNotification (DirectNotificationRequest) returns (DirectNotificationResponse);
}

// Initial request parameters to establish the server-side stream
message StreamRequest {
  string serviceName = 1; // Identifier of the calling service (e.g. "Core-API-1")
  string secureToken = 2; // Internal authentication secret
}

// Structure of a single notification packet flowing down the stream
message NotificationPayload {
  string notificationId = 1;
  string receiverId = 2;       // Target user ID
  string deviceToken = 3;      // Target device FCM token
  string title = 4;            // Notification heading
  string body = 5;             // Notification description body
  string category = 6;         // Type: "ALERT", "GRADE", "POST", "COMMENT"
  map<string, string> data = 7; // Custom payload variables
  int64 timestamp = 8;         // Epoch timestamp
}

// Single push request structure
message DirectNotificationRequest {
  string receiverId = 1;
  string title = 2;
  string body = 3;
  string category = 4;
  map<string, string> data = 5;
}

// Direct send outcome
message DirectNotificationResponse {
  bool success = 1;
  string messageId = 2;
  string errorMessage = 3;
}
```
