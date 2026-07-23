# System Design Document (SDD)

# Vishnu Pass – Digital Student Identification System

---

# 1. Introduction

## 1.1 Purpose

This document describes the **system architecture, components, modules, and design decisions** for the **Vishnu Pass** system.

Vishnu Pass is a web-based platform that allows students to generate a **dynamic QR code digital ID** when they forget their physical ID card. Security staff can scan the QR code to verify student identity instantly.

---

## 1.2 Scope

The Vishnu Pass system provides:

* Digital student ID verification
* Dynamic QR code generation
* QR scanning verification
* Student management by admin
* Role-based dashboards

The system provides a **single login portal** and redirects users based on their role.

Roles supported:

* Admin
* Student
* Security / Director

---

## 1.3 Definitions

| Term              | Description                                         |
| ----------------- | --------------------------------------------------- |
| QR Code           | Machine-readable code used for student verification |
| Token             | Temporary identifier embedded inside the QR code    |
| Dashboard         | Main user interface after login                     |
| Verification Page | Page displaying student identity after scanning QR  |

---

# 2. System Overview

## 2.1 System Architecture

The Vishnu Pass system follows a **three-tier architecture**:

1. Presentation Layer (Frontend)
2. Application Layer (Backend Services)
3. Data Layer (Database)

---

## 2.2 High-Level Architecture

```text
Users (Student / Admin / Security)
            │
            ▼
      React Frontend (Vite)
            │
            ▼
      Supabase Backend
      (Auth + API + Storage)
            │
            ▼
     PostgreSQL Database
```

---

# 3. Technology Stack

## Frontend

| Technology   | Purpose        |
| ------------ | -------------- |
| React        | User Interface |
| Vite         | Build Tool     |
| React Router | Page routing   |
| TailwindCSS  | UI styling     |

---

## Backend

| Technology       | Purpose               |
| ---------------- | --------------------- |
| Supabase         | Backend services      |
| Supabase Auth    | User authentication   |
| Supabase Storage | Student image storage |

---

## Database

| Technology | Purpose      |
| ---------- | ------------ |
| PostgreSQL | Data storage |

---

## Deployment

| Platform         | Purpose          |
| ---------------- | ---------------- |
| Vercel / Netlify | Frontend hosting |
| Supabase Cloud   | Backend services |

---

# 4. System Modules

The system consists of the following modules:

1. Authentication Module
2. Student Module
3. QR Code Generation Module
4. Verification Module
5. Admin Module

---

# 5. Module Design

---

# 5.1 Authentication Module

## Description

Handles login authentication and user role verification.

## Features

* Single login portal
* Role-based access
* Secure session management

## Workflow

```text
User Login
   │
   ▼
Supabase Authentication
   │
   ▼
Fetch User Role
   │
   ▼
Redirect to Dashboard
```

---

# 5.2 Student Module

## Description

Allows students to access their digital ID.

## Features

* Student login
* Profile display
* Dynamic QR code generation
* QR refresh timer

## Student Dashboard Displays

* Student Name
* Student ID
* Department
* Year
* Student Photo
* QR Code

---

# 5.3 QR Code Generation Module

## Description

Generates temporary QR tokens for student verification.

## Functionality

* Generate unique token
* Encode token inside QR code
* Refresh QR code every 30 seconds

Example verification link:

```text
https://vishnupass.com/verify/{token}
```

---

# 5.4 Verification Module

## Description

Handles the QR scanning verification process.

## Verification Flow

1. Security scans QR code
2. Browser opens verification page
3. System validates QR token
4. Student information is displayed

---

## Verification Page Displays

* Student photo
* Student name
* Student ID
* Department
* Year
* Verification status

Status types:

* Valid
* Expired
* Invalid

---

# 5.5 Admin Module

## Description

Allows administrators to manage students and system settings.

## Features

* Add student
* Edit student details
* Delete student
* Upload student photo
* Reset passwords
* View student list

---

# 6. Database Design

---

## 6.1 Users Table

| Field | Type | Description |
| ----- | ---- | ----------- |
| id    | UUID | Primary key |
| email | TEXT | Login email |
| role  | TEXT | User role   |

---

## 6.2 Students Table

| Field      | Type    | Description   |
| ---------- | ------- | ------------- |
| id         | UUID    | Primary key   |
| student_id | TEXT    | College ID    |
| name       | TEXT    | Student name  |
| department | TEXT    | Department    |
| year       | INTEGER | Academic year |
| photo_url  | TEXT    | Student image |

---

## 6.3 QR Tokens Table

| Field      | Type      | Description       |
| ---------- | --------- | ----------------- |
| id         | UUID      | Primary key       |
| student_id | UUID      | Student reference |
| token      | TEXT      | QR token          |
| expires_at | TIMESTAMP | Token expiry time |

---

# 7. Data Flow Design

## QR Generation Flow

```text
Student Login
     │
     ▼
Request QR Token
     │
     ▼
Backend Generates Token
     │
     ▼
Token Stored in Database
     │
     ▼
QR Code Displayed
```

---

## Verification Flow

```text
Security Scans QR
       │
       ▼
Verification Page Opens
       │
       ▼
System Validates Token
       │
       ▼
Display Student Details
```

---

# 8. Security Design

Security mechanisms include:

* Dynamic QR tokens
* Token expiration (30 seconds)
* HTTPS communication
* Role-based access control
* Admin-controlled student creation

---

# 9. UI Design Guidelines

Primary Colors

| Color  | Hex     |
| ------ | ------- |
| Orange | #F47C20 |
| Purple | #9C2A8C |
| Green  | #9DC63B |

Neutral Colors

| Color      | Hex     |
| ---------- | ------- |
| Dark Gray  | #2B2B2B |
| Light Gray | #F5F6F8 |
| White      | #FFFFFF |

---

# 10. Scalability Considerations

The system should support:

* 10,000+ students
* Multiple verification requests
* Multiple security checkpoints

Optimization techniques:

* Efficient database queries
* Token expiration cleanup
* CDN-based frontend hosting

---

# 11. Error Handling

Possible errors and solutions:

| Error         | Handling                  |
| ------------- | ------------------------- |
| Invalid QR    | Show invalid message      |
| Expired token | Ask student to refresh QR |
| Network error | Retry request             |

---

# 12. Deployment Architecture

```text
User Device
     │
     ▼
Frontend (React + Vite)
     │
     ▼
Supabase Backend
     │
     ▼
PostgreSQL Database
```

---

# 13. Future Enhancements

Future improvements may include:

* Mobile application
* Facial recognition verification
* Attendance tracking
* Entry/exit logs
* NFC digital ID

---

# 14. Conclusion

The Vishnu Pass system provides a secure and scalable digital identification solution for educational institutions. The architecture ensures fast verification through dynamic QR codes while giving administrators full control over student data.
