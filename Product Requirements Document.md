# Product Requirements Document (PRD)

# Vishnu Pass – Digital Student ID System

---

# 1. Product Overview

**Product Name:** Vishnu Pass
**Organization:** Vishnu Universal Learning
**Platform:** Web Application

Vishnu Pass is a digital identification system designed for engineering colleges. The system allows students to generate a **dynamic QR code** when they forget their physical ID cards. Security staff can scan the QR code to verify the student’s identity instantly.

The QR code refreshes **every 30 seconds** to prevent misuse such as screenshots.

The system contains a **single login portal**, and based on the user role the system redirects to different dashboards:

* Admin Dashboard
* Student Dashboard
* Security / Director Dashboard

---

# 2. Problem Statement

Students often forget their physical ID cards, causing:

* Entry delays at campus gates
* Manual verification issues
* Security risks
* Administrative inefficiencies

There is currently **no reliable digital backup system for student identification**.

---

# 3. Solution

Vishnu Pass provides a **secure digital ID system** using **dynamic QR codes**.

When students forget their ID card:

1. They log into the Vishnu Pass portal.
2. A **dynamic QR code** is generated.
3. Security scans the QR code.
4. The system displays student details for verification.

---

# 4. Goals and Objectives

## Primary Goals

* Provide a digital alternative for student ID cards
* Enable fast student verification
* Improve campus security

## Secondary Goals

* Reduce manual verification
* Centralize student information
* Provide an admin management system

---

# 5. Target Users

## Students

Use the system to generate digital ID QR codes.

## Security Staff / Director

Scan QR codes and verify student details.

## Admin

Manage the entire system including student records and access credentials.

---

# 6. Core Features

---

# 6.1 Single Login Portal

The system provides **one login page for all users**.

After login, the system checks the **user role** and redirects accordingly.

Roles:

* Admin
* Student
* Security Staff / Director

Example routing:

```
Login → Check Role

Admin → /admin
Student → /student
Security → /security
```

---

# 6.2 Student Dashboard

The student dashboard allows students to generate their digital pass.

Features:

* Dynamic QR Code
* QR refresh timer (30 seconds)
* Student profile details
* Digital ID display

Displayed information:

* Student Name
* Student ID
* Department
* Year
* Student Photo

---

# 6.3 Dynamic QR Code

Each student receives a **QR code that refreshes every 30 seconds**.

Purpose:

* Prevent screenshot misuse
* Provide secure authentication

QR contains a verification URL.

Example:

```
https://vishnupass.com/verify/{token}
```

---

# 6.4 QR Verification System

When security scans the QR code:

1. The verification page opens.
2. The system validates the QR token.
3. Student details are displayed.

Verification page shows:

* Student photo
* Student name
* Student ID
* Department
* Year
* College name
* Verification status

Status types:

* Valid
* Expired
* Invalid

---

# 6.5 Security / Director Dashboard

Security staff access a simple interface for verification.

Features:

* QR scanning interface
* Student verification page
* Scan history (optional future feature)

Design goal:

Fast verification with minimal interface complexity.

---

# 6.6 Admin Dashboard

The admin manages the entire system.

Admin capabilities:

* Add students
* Edit student details
* Delete students
* Upload student photos
* Generate login credentials
* Reset passwords
* View QR scan logs

---

# 7. User Flow

---

## Student Flow

```
Student Login
     ↓
Student Dashboard
     ↓
Dynamic QR Generated
     ↓
QR Refresh every 30 seconds
     ↓
Student shows QR to security
```

---

## Security Flow

```
Security scans QR
     ↓
Verification page opens
     ↓
System validates token
     ↓
Student details displayed
     ↓
Security verifies student
```

---

## Admin Flow

```
Admin Login
     ↓
Admin Dashboard
     ↓
Manage students
     ↓
Create login credentials
```

---

# 8. Technology Stack

## Frontend

* Vite
* React
* React Router
* TailwindCSS

## Backend

* Supabase

## Authentication

* Supabase Auth

## Database

* Supabase PostgreSQL

## Deployment

* Vercel / Netlify

---

# 9. Database Overview

## Users Table

| Field    | Type |
| -------- | ---- |
| id       | UUID |
| role     | TEXT |
| email    | TEXT |
| password | TEXT |

---

## Students Table

| Field      | Type    |
| ---------- | ------- |
| id         | UUID    |
| student_id | TEXT    |
| name       | TEXT    |
| department | TEXT    |
| year       | INTEGER |
| photo_url  | TEXT    |

---

## QR Tokens Table

| Field      | Type      |
| ---------- | --------- |
| id         | UUID      |
| student_id | UUID      |
| token      | TEXT      |
| expires_at | TIMESTAMP |

---

# 10. UI Design Requirements

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

Design style:

* Modern SaaS dashboard
* Card-based UI
* Clean layout
* Responsive design

---

# 11. Non-Functional Requirements

## Performance

* QR generation time < 1 second
* Verification page load < 2 seconds

## Security

* QR token expires every 30 seconds
* HTTPS encryption
* Role-based access control

## Scalability

System must support:

* 10,000+ students
* Multiple security checkpoints

---

# 12. Future Enhancements

Future improvements may include:

* Mobile application
* Facial recognition verification
* Attendance tracking
* Entry/exit logging
* NFC digital ID

---

# 13. Success Metrics

Success will be measured by:

* Number of students using digital pass
* Verification speed
* Reduction in manual ID verification
* System uptime

---

# 14. Project Timeline

| Phase       | Duration |
| ----------- | -------- |
| Planning    | 1 Week   |
| Design      | 1 Week   |
| Development | 3 Weeks  |
| Testing     | 1 Week   |
| Deployment  | 1 Week   |

---

# 15. Conclusion

Vishnu Pass provides a secure and scalable digital identification solution for students. By implementing dynamic QR codes and centralized management, the system improves campus security while providing a convenient alternative to physical ID cards.
