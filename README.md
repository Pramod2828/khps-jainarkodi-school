# Government Primary School Jainarkodi
## Web Management System & REST API (Phase 1)

A complete, modern, responsive school management web application and decoupled REST API for **Government Primary School Jainarkodi**. 

Built with a strict REST architecture (`Next.js / Android APK → Express REST API → MySQL Database`), ensuring that a future **Android APK** can communicate directly with the exact same Node.js REST API and MySQL database.

---

## 🛠 Technology Stack

- **Frontend**: Next.js 14 / 15, React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Axios
- **Backend**: Node.js, Express.js REST API
- **Database**: MySQL (`school_jainarkodi`), InnoDB, UTF-8 (`utf8mb4_unicode_ci`)
- **Authentication**: JWT Tokens, bcrypt password hashing, HttpOnly cookies & Bearer tokens, Role-Based Access Control (`SUPER_ADMIN` and `TEACHER`)
- **Storage**: Local file storage (`backend/uploads/`) with mime-type validation, size limits (5MB images, 10MB PDFs), and sanitized filenames

---

## 🚀 Quick Setup & Installation Guide

### Prerequisites
1. **Node.js** v18+ and **NPM** v9+ installed.
2. **MySQL Server** (XAMPP / Standalone MySQL) running on port `3306`.

---

### Step 1: Database Migration & Seeding

Navigate to the `backend` directory and run the automated database initialization script:

```bash
cd backend
npm install
npm run db:init
```

This script automatically:
1. Creates the MySQL database `school_jainarkodi`.
2. Executes `database/schema.sql` to generate 18 relational tables with foreign keys and indexes.
3. Executes `database/seed.sql` to populate default roles, school information, gallery categories, classes (1st to 5th Standard), sections, and subjects.
4. Creates default development credentials with bcrypt hashed passwords (`Admin@123` & `Teacher@123`).
5. Seeds sample homework, notice board circulars, announcements, school activities, photo gallery images, academic calendar events, and downloadable worksheets.

---

### Step 2: Start Backend REST API Server

```bash
cd backend
npm run dev
# or node src/server.js
```
The REST API server will start on **`http://localhost:5000`**.
Healthcheck Endpoint: `http://localhost:5000/api/health`

---

### Step 3: Start Next.js Web Application

In a separate terminal window:

```bash
cd frontend
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🔑 Default Development Credentials

> [!IMPORTANT]
> - **Super Admin Account**:
>   - **Email/Username**: `admin@jainarkodi.edu.in`
>   - **Password**: `Admin@123`
>   - **Permissions**: Full system access, teacher management, teacher password reset, audit logs, class/homework/notice management, school settings.
> - **Teacher Account**:
>   - **Email/Username**: `teacher@jainarkodi.edu.in`
>   - **Password**: `Teacher@123`
>   - **Permissions**: Homework CRUD, notice board CRUD, activities upload, gallery upload, student directory view. (Restricted from deleting teachers or viewing audit logs).

---

## 📱 Future Android APK Integration Architecture

```text
Next.js Web Application
          │
          │ HTTP REST API
          ▼
Node.js + Express.js
          │
          │ mysql2 connection pool
          ▼
       MySQL
          ▲
          │
          │ HTTP REST API
          │
Future Android APK
```

- Neither the Next.js Frontend nor the Android APK connects directly to MySQL.
- The Android APK uses the exact same REST API endpoints (`/api/auth/login`, `/api/homework`, `/api/notices`, `/api/activities`, `/api/gallery`).
- See [API_DOCUMENTATION.md](file:///c:/Users/Admin/OneDrive/Desktop/school%20project/API_DOCUMENTATION.md) for full endpoint specifications, payload examples, and Retrofit HTTP client integration code.

---

## 🌐 Public Clean URLs

- `/` : Homepage (Hero, Announcement Ticker, Latest Homework, Notices, Activities, Upcoming Events, Quick Access)
- `/homework` : Class Homework page with 1st–5th Standard tab filters, subject filter, date filter, search, and attachment download
- `/notices` : Notice Board with Urgent/Important/Normal priority highlights, Active vs Archived tabs, and PDF downloads
- `/activities` : School Activities page with cover photos, event stories, multi-photo gallery, and video links
- `/gallery` : Photo Gallery with category filter pills (Events, Sports, Cultural, Classroom, Infrastructure) and Lightbox viewer
- `/about` : School Information page with Head Teacher note, timings, address, phone, email, and Google Map link
- `/calendar` : Academic Calendar with filterable event cards (Holidays, Exams, Parent Meetings, Celebrations)
- `/downloads` : Free Educational Downloads page with worksheets, study materials, circulars, and forms
- `/contact` : Contact Us page with school office info and parent inquiry form
- `/login` : Teacher & Admin Login page

---

## 🔒 Protected Admin Panel (`/admin`)

- `/admin` : Dashboard overview with 8 KPI cards, Recharts analytics (Homework by Class, Students per Class), and Recent Activity timeline
- `/admin/homework` : Homework CRUD with subject selection (`subject_id` FK) and auto day calculation (`Asia/Kolkata`)
- `/admin/notices` : Notice board management with priority selection and expiry dates
- `/admin/announcements` : Homepage banner ticker manager
- `/admin/activities` : School event activity post creator with multi-image uploader
- `/admin/gallery` : Photo upload manager
- `/admin/students` : Student directory with class filter & guardian phone numbers
- `/admin/classes` : Dynamic class & section manager with student count metrics
- `/admin/teachers` : Super Admin teacher account manager & password reset tool
- `/admin/school` : School metadata editor
- `/admin/calendar` : Academic event scheduler
- `/admin/downloads` : Worksheet repository manager
- `/admin/audit-logs` : Super Admin security audit log trail

---

## ✅ Verification & Security Checklist

- [x] **MySQL Single Source of Truth**: All statistics, homework, notices, gallery, students, and users come directly from MySQL queries.
- [x] **No Plain-text Passwords**: Hashed with `bcryptjs`.
- [x] **JWT Auth & Authorization**: Protected routes enforce `verifyToken`, `requireTeacherOrAdmin`, and `requireSuperAdmin`.
- [x] **Student Data Protection**: Private student info (parent phone) is protected and hidden from unauthenticated public GET APIs.
- [x] **File Upload Security**: Executable files (`.exe`, `.sh`, `.bat`, `.php`, etc.) BANNED. Max 5MB for images, 10MB for PDFs.
- [x] **Parameterized Queries**: All database queries use prepared statements with `mysql2/promise` to prevent SQL injection.
- [x] **Asia/Kolkata Timezone**: Auto calculation of homework day from date.
- [x] **Responsive Design**: Mobile-friendly layouts tested from 360px up to 1440px+.
