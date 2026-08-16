# REST API Documentation & Android APK Integration Guide
## Government Primary School Jainarkodi

This document provides complete API reference documentation for the backend REST API powering both the **Next.js Web Application** and the **Future Android APK**.

---

## 1. System Architecture

```text
                    ┌─────────────────────────┐
                    │      MySQL Database     │
                    │   (school_jainarkodi)   │
                    └────────────▲────────────┘
                                 │ mysql2 pool
                    ┌────────────┴────────────┐
                    │  Node.js + Express.js   │
                    │      REST API           │
                    └────────────▲────────────┘
                                 │
                  ┌──────────────┴──────────────┐
                  │                             │
       ┌──────────┴──────────┐       ┌──────────┴──────────┐
       │   Next.js Web App   │       │ Future Android APK  │
       │    (Port 3000)      │       │ (Native Java/Kotlin)│
       └─────────────────────┘       └─────────────────────┘
```

- **Base REST API URL**: `http://<server-ip>:5000/api`
- **File Upload Base URL**: `http://<server-ip>:5000/uploads/`
- **Time Zone Strategy**: `Asia/Kolkata` (+05:30)

---

## 2. Authentication Standard

### Request Headers
For protected endpoints (POST, PUT, DELETE, Admin GETs), pass the JWT token in the HTTP Authorization header:

```http
Authorization: Bearer <YOUR_JWT_TOKEN>
Content-Type: application/json
```

### Standard Response Format

#### Success Response (200 / 201)
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

#### Error Response (400 / 401 / 403 / 404 / 500)
```json
{
  "success": false,
  "error": {
    "message": "Invalid email or password.",
    "code": "INVALID_CREDENTIALS",
    "details": null
  }
}
```

---

## 3. Endpoints Reference

### A. Authentication Module (`/api/auth`)

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | POST | Public | Authenticate user & retrieve JWT token |
| `/api/auth/logout` | POST | Public | Logout & clear auth cookies |
| `/api/auth/me` | GET | Protected | Retrieve authenticated user profile |
| `/api/auth/change-password` | POST | Protected | Update current logged-in user password |

#### POST `/api/auth/login`
- **Request Body**:
```json
{
  "email": "teacher@jainarkodi.edu.in",
  "password": "Teacher@123"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 2,
      "name": "Teacher Anitha",
      "email": "teacher@jainarkodi.edu.in",
      "role": "TEACHER",
      "must_change_password": true
    }
  }
}
```

---

### B. Homework Module (`/api/homework`)

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/homework` | GET | Public | Paginated list with filters (`class_id`, `subject_id`, `date`, `search`) |
| `/api/homework/:id` | GET | Public | Single homework details |
| `/api/homework` | POST | Teacher/Admin | Upload new class homework assignment (supports file attachment) |
| `/api/homework/:id` | PUT | Teacher/Admin | Edit homework assignment |
| `/api/homework/:id` | DELETE | Teacher/Admin | Delete homework assignment |

#### POST `/api/homework` (Multipart Form Data)
- **Form Fields**:
  - `class_id` (number, required)
  - `section_id` (number, optional)
  - `subject_id` (number, required - foreign key pointing to `subjects` table)
  - `title` (string, required)
  - `description` (string, required)
  - `homework_date` (string `YYYY-MM-DD`, required)
  - `homework_time` (string `HH:MM:SS`, default `16:30:00`)
  - `due_date` (string `YYYY-MM-DD`, required)
  - `attachment` (file, optional - PDF/JPG/PNG max 10MB)

---

### C. Notice Board Module (`/api/notices`)

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/notices` | GET | Public | Active notices with priority badges (`priority`, `is_archived`) |
| `/api/notices/:id` | GET | Public | Detailed notice view |
| `/api/notices` | POST | Teacher/Admin | Create new notice bulletin |
| `/api/notices/:id` | PUT | Teacher/Admin | Edit notice bulletin |
| `/api/notices/:id` | DELETE | Teacher/Admin | Delete notice bulletin |

---

### D. Announcements Module (`/api/announcements`)

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/announcements` | GET | Public | Homepage banner ticker messages |
| `/api/announcements` | POST | Teacher/Admin | Create ticker announcement |
| `/api/announcements/:id` | PUT | Teacher/Admin | Toggle banner active state |
| `/api/announcements/:id` | DELETE | Teacher/Admin | Delete announcement |

---

### E. School Activities Module (`/api/activities`)

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/activities` | GET | Public | Paginated list of event stories & celebrations |
| `/api/activities/:id` | GET | Public | Event details with multi-image gallery |
| `/api/activities` | POST | Teacher/Admin | Create event post with cover & multi-photo upload |
| `/api/activities/:id` | DELETE | Teacher/Admin | Delete activity story |

---

### F. Photo Gallery Module (`/api/gallery`)

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/gallery/categories` | GET | Public | List gallery categories |
| `/api/gallery` | GET | Public | Categorized photos (`category_id`) |
| `/api/gallery` | POST | Teacher/Admin | Upload photo (Max 5MB JPG/PNG) |
| `/api/gallery/:id` | DELETE | Teacher/Admin | Delete photo |

---

### G. Student Directory Module (`/api/students`)

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/students` | GET | Teacher/Admin | Paginated student directory with class filters |
| `/api/students/:id` | GET | Teacher/Admin | Single student record |
| `/api/students` | POST | Teacher/Admin | Enroll new student |
| `/api/students/:id` | PUT | Teacher/Admin | Update student record |
| `/api/students/:id` | DELETE | Teacher/Admin | Delete student record |

*Note: Student parent contact information is strictly protected and accessible only to authenticated Teachers and Super Admins.*

---

### H. Teacher Management Module (`/api/teachers`)

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/teachers` | GET | Super Admin Only | List teacher accounts |
| `/api/teachers` | POST | Super Admin Only | Create new teacher login |
| `/api/teachers/:id/status` | PUT | Super Admin Only | Toggle teacher active/inactive status |
| `/api/teachers/:id/reset-password` | POST | Super Admin Only | Reset teacher password |

---

### I. Dashboard Analytics (`/api/dashboard`)

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/dashboard/stats` | GET | Teacher/Admin | Real-time computed database metrics |
| `/api/dashboard/charts` | GET | Teacher/Admin | Aggregated chart datasets for class distribution & weekly homework |
| `/api/dashboard/recent-activity` | GET | Teacher/Admin | Real-time audit log timeline |

---

## 4. Android APK Integration Guidelines

When creating the future **Android Application (Kotlin / Java)**:

1. **HTTP REST Client (Retrofit 2 / Volley)**:
   - Configure base URL to `http://<SERVER_IP>:5000/api/`.
   - Use `EncryptedSharedPreferences` or Android KeyStore to store the JWT token upon login.
   - Add an OkHttp `Interceptor` to attach header `Authorization: Bearer <TOKEN>`.

2. **File Downloads**:
   - For homework attachments, prepend backend host URL to file paths: e.g., `http://<SERVER_IP>:5000/uploads/file.pdf`.

3. **FCM Push Notification Preparation**:
   - The backend data structures (`homework`, `notices`, `announcements`) include timestamps and IDs ready to send FCM push payloads when new items are posted.
