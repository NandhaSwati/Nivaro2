# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Docker Development
- `docker-compose up --build` - Build and start all services with databases
- `docker-compose down` - Stop all services and databases
- `docker-compose logs [service-name]` - View logs for a service (e.g., `api-gateway`, `user-service`)

### Frontend Development
- `cd frontend && npm run dev` - Start Vite dev server on port 5173
- `cd frontend && npm run build` - Build production frontend
- `cd frontend && npm run preview` - Preview production build

### Backend Service Development
Each service in `services/` has:
- `npm start` - Start the service (run from the service directory)
- Default ports: api-gateway:8080, user-service:4001, booking-service:4002, notification-service:4003

## Architecture Overview

### Service-Oriented Architecture
Nivaro is a microservices-based home service booking platform with these components:

**API Gateway** (`services/api-gateway/`)
- Entry point (port 8080); CORS, JSON body parsing, request logging
- Validates JWT for all `/api/*` routes except `/api/auth/*`
- Proxies:
  - `/api/auth/*` → user-service
  - `/api/users/*` → user-service
  - `/api/bookings/*` → booking-service

**User Service** (`services/user-service/`)
- Auth: `/auth/register`, `/auth/login`; Profile: `/users/me`
- PostgreSQL `users_db` (auto-init schema on boot)
- Bcrypt password hashing; issues 7d JWTs

**Booking Service** (`services/booking-service/`)
- Catalog: `/services`; Bookings: `/bookings` (list/create)
- PostgreSQL `bookings_db` (auto-init + seed services)
- Posts confirmation notifications to Notification Service

**Notification Service** (`services/notification-service/`)
- Stub that logs email notifications; MailHog used in dev (UI: :8025, SMTP: :1025)

**Frontend** (`frontend/`)
- React + Vite; TanStack Query; React Router; Tailwind CSS
- Dev proxy sends `/api/*` to the gateway when running in Docker

### Databases
- `users_db` (users table); `bookings_db` (services, bookings)
- Managed by service startup SQL; no external migrations

### Authn/Authz Flow
1. Frontend → `/api/auth/*` via gateway → user-service (register/login)
2. JWT returned to frontend; stored in `localStorage`; sent via `Authorization: Bearer ...`
3. Gateway verifies JWT for `/api/*` (except `/api/auth/*`) before proxying

### Integration Contracts and Gotchas
- User context to Booking Service: booking-service reads `x-user-id`/`x-user-email` headers for `/bookings`.
  - Current gateway validates JWT but does not set these headers; without them, booking endpoints will 401.
- Notification endpoint path: booking-service posts to `/notify`, notification-service exposes `/api/notify`.
  - In docker-compose, `NOTIFICATION_URL` is `http://notification-service:4003/notify` (path mismatch).
- Frontend dev proxy targets `http://api-gateway:8080` (works inside Docker). For host-local dev, point to `http://localhost:8080`.

### CI/CD
- CI builds Docker images for all services (no push) on PRs/commits to `main` (`.github/workflows/ci.yml`).
- CD pushes versioned images on tags `v*.*.*` to Docker Hub using `DOCKERHUB_USERNAME`/`DOCKERHUB_TOKEN` secrets (`.github/workflows/cd.yml`).
