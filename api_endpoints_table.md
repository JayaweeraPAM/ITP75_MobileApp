# 📚 API Endpoints Table

This document provides a comprehensive list of all RESTful API endpoints implemented in the **Tutor Chat & Management Mobile Application** backend.

---

### 🔑 Authentication & User Management

| HTTP Method | Route | Description | Protected |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | Register a new user (Student or Tutor) | No |
| **POST** | `/api/auth/login` | Login user & issue JWT token | No |
| **GET** | `/api/users/me` | Fetch currently logged in user profile | Yes |
| **PATCH**| `/api/users/me` | Update logged in user profile | Yes |
| **GET** | `/api/users/:id/profile` | Fetch public user profile details | Yes |

---

### 🧑‍🏫 Tutor Profiles & Registration

| HTTP Method | Route | Description | Protected |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/tutors` | List active, approved tutors with active subscriptions | No |
| **GET** | `/api/tutors/search` | Search tutors by subject, category, medium, etc. | No |
| **GET** | `/api/tutors/me/profile` | Authenticated tutor fetches their own profile details | Yes |
| **PUT** | `/api/tutors/profile` | Update live tutor profile | Yes |
| **POST**| `/api/tutors/register` | Register a new tutor profile (Requires Admin review) | No |
| **GET** | `/api/tutors/:tutorId/details` | View detailed public profile of a single tutor | No |

---

### 📂 File Management & Static Files

| HTTP Method | Route | Description | Protected |
| :--- | :--- | :--- | :--- |
| **PUT** | `/api/tutors/me/materials` | Create or update learning materials for a subject | Yes |
| **GET** | `/api/tutors/:tutorId/materials` | Students fetch learning materials (Requires PAID booking) | Yes |
| **GET** | `/api/materials/file/:tId/:fn` | Downloads a protected learning material file | Yes |
| **POST**| `/api/upload` | Upload image/file via base64 JSON payload or Multer | No |
| **POST**| `/api/upload-image` | Upload an image via base64 JSON payload or Multer | No |
| **GET** | `/uploads/:filename` | Public/Cached direct static serving fallback from MongoDB | No |

---

### 💬 Live Chat & AI Support Assistant

| HTTP Method | Route | Description | Protected |
| :--- | :--- | :--- | :--- |
| **POST**| `/api/ai-chat/sessions` | Create a new AI chat conversation session | No |
| **POST**| `/api/ai-chat/sessions/:id/msgs` | Post a message & retrieve a direct Gemini AI reply | No |
| **POST**| `/api/chat/requests` | Send a new chat request to a tutor | No |
| **GET** | `/api/tutor/chat/requests` | Fetch pending chat requests for a tutor | Yes |

---

### 📅 Booking & Appointment System

| HTTP Method | Route | Description | Protected |
| :--- | :--- | :--- | :--- |
| **POST**| `/api/bookings` | Request a tutoring session with a tutor | Yes |
| **POST**| `/api/bookings/:id/pay` | Complete payment for a class to unlock materials | Yes |

---

### 🏢 Institutes Management

| HTTP Method | Route | Description | Protected |
| :--- | :--- | :--- | :--- |
| **POST**| `/api/institutes` | Create a new educational institute | Yes |
| **POST**| `/api/institutes/:id/join` | Tutors request to join an institute | Yes |
| **POST**| `/api/institutes/requests` | Register a new institute with an owner request | Yes |

---

### 💳 Subscription Management

| HTTP Method | Route | Description | Protected |
| :--- | :--- | :--- | :--- |
| **POST**| `/api/subscription/trial` | Claim a 30-day free trial subscription | Yes |
| **POST**| `/api/subscription/pay` | Pay for a paid subscription (monthly/annual) | Yes |
| **GET** | `/api/subscription/:tutorId`| Fetch subscription information for a tutor | No |
