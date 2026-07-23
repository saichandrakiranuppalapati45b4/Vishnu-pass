# Software Requirements Specification (SRS)

## Vishnu Pass – Digital Student Identification System

---

# 1. Introduction

## 1.1 Purpose

The purpose of this document is to describe the software requirements for **Vishnu Pass**, a web-based system that allows students to generate a **temporary digital ID using a dynamic QR code** when they forget their physical ID card.

Security personnel can scan the QR code and instantly verify the student's identity.

---

## 1.2 Scope

Vishnu Pass is a **web application** designed for college campuses.

The system provides:

* Digital student identification
* Dynamic QR code generation
* Student verification through QR scanning
* Role-based dashboards
* Admin-controlled student management

The system will provide **one login portal** and redirect users based on their role.

Roles supported:

* Admin
* Student
* Security / Director

---

## 1.3 Definitions, Acronyms, and Abbreviations

| Term              | Description                                    |
| ----------------- | ---------------------------------------------- |
| QR Code           | Machine-readable code used for identification  |
| Token             | Temporary identifier embedded in the QR code   |
| Admin             | System administrator managing the platform     |
| Dashboard         | User interface after login                     |
| Verification Page | Page displaying student identity after QR scan |

---

## 1.4 Intended Audience

This document is intended for:

* Software developers
* System designers
* Project managers
* Stakeholders

---

## 1.5 Overview

This document describes:

* Overall system description
* Functional requirements
* Non-functional requirements
* External interface requirements
* Database requirements

---

# 2. Overall Description

## 2.1 Product Perspective

Vishnu Pass is a **web-based digital identity system** consisting of three main modules:

1. Student Module
2. Admin Module
3. Security Verification Module

The system uses:

Frontend:

* React
* Vite

Backend:

* Supabase

Database:

* PostgreSQL (Supabase)

---

## 2.2 Product Functions

The system will provide the following functions:

* User authentication
* Role-based dashboard access
* Dynamic QR code generation
* QR code verification
* Student data management
* Admin system control

---

## 2.3 User Classes and Characteristics

### Students

Students use the system to access their digital ID.

Capabilities:

* Login
* View profile
* Generate QR code

Technical Skill Level: Basic

---

### Security Staff / Director

Security personnel verify student identities.

Capabilities:

* Scan QR code
* View verification page

Technical Skill Level: Basic

---

### Admin

Admin manages the entire system.

Capabilities:

* Add students
* Update student data
* Delete students
* Reset passwords
* Upload student photos

Technical Skill Level: Intermediate

---

## 2.4 Operating Environment

The system will operate on:

Browsers:

* Chrome
* Edge
* Firefox

Devices:

* Desktop computers
* Smartphones
* QR scanners

Backend Environment:

* Supabase Cloud

Hosting:

* Vercel / Netlify

---

## 2.5 Design Constraints

* QR code must refresh every **30 seconds**
* Students cannot register themselves
* Admin must create student accounts
* Authentication must use **Supabase Auth**
* Secure HTTPS communication must be used

---

## 2.6 Assumptions and Dependencies

Assumptions:

* Students have internet access
* Security staff have QR scanners or smartphones
* Admin maintains student data

Dependencies:

* Supabase services
* Internet connectivity

---

# 3. Functional Requirements

---

## 3.1 Authentication System

FR-1
The system shall provide a **single login portal** for all users.

FR-2
The system shall authenticate users using Supabase Auth.

FR-3
The system shall redirect users based on their role.

Example routing:

```
Admin → /admin
Student → /student
Security → /security
```

---

## 3.2 Student Dashboard

FR-4
The system shall display the student dashboard after login.

FR-5
The system shall display student profile information.

FR-6
The system shall generate a dynamic QR code.

FR-7
The QR code shall refresh every **30 seconds**.

Displayed information:

* Student name
* Student ID
* Department
* Year
* Student photo

---

## 3.3 Dynamic QR Code System

FR-8
The system shall generate a unique QR token.

FR-9
The QR token shall expire after **30 seconds**.

FR-10
The QR code shall contain a verification URL.

Example:

```
https://vishnupass.com/verify/{token}
```

---

## 3.4 QR Verification System

FR-11
The system shall validate the QR token.

FR-12
If the token is valid, the system shall display student details.

FR-13
If the token is expired, the system shall display an expired message.

FR-14
The verification page shall display:

* Student photo
* Student name
* Student ID
* Department
* Year
* Verification status

---

## 3.5 Admin Dashboard

FR-15
The admin shall be able to add new students.

FR-16
The admin shall be able to edit student information.

FR-17
The admin shall be able to delete students.

FR-18
The admin shall be able to upload student photos.

FR-19
The admin shall be able to reset passwords.

---

# 4. External Interface Requirements

## 4.1 User Interface

Student Interface:

* QR code display
* Student profile card
* QR refresh timer

Admin Interface:

* Dashboard statistics
* Student management table
* Student creation form

Security Interface:

* QR verification page
* Student identity display

---

## 4.2 Hardware Interface

The system supports:

* Smartphones
* QR scanners
* Desktop computers

---

## 4.3 Software Interface

| Software   | Purpose          |
| ---------- | ---------------- |
| React      | Frontend UI      |
| Vite       | Build tool       |
| Supabase   | Backend services |
| PostgreSQL | Database         |

---

## 4.4 Communication Interface

Communication methods include:

* HTTPS requests
* REST APIs
* Supabase APIs

---

# 5. Non-Functional Requirements

## 5.1 Performance

* QR code generation time < 1 second
* Verification page load time < 2 seconds

---

## 5.2 Security

The system must implement:

* Secure authentication
* Token expiration
* Role-based access control
* HTTPS encryption

---

## 5.3 Reliability

System availability should be at least **99% uptime**.

The system must handle:

* Invalid QR codes
* Expired tokens
* Network errors

---

## 5.4 Scalability

The system must support:

* 10,000+ students
* Multiple concurrent QR verifications

---

## 5.5 Usability

The system must provide:

* Simple interface for students
* Fast verification for security staff
* Easy management tools for admins

---

# 6. Database Requirements

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

# 7. Future Enhancements

Future improvements may include:

* Mobile application
* Face verification
* Entry and exit logs
* Attendance integration
* NFC digital ID

---

# 8. Conclusion

Vishnu Pass provides a secure and scalable digital identification system for educational institutions. The system improves campus security by allowing quick verification of students through dynamic QR codes.
