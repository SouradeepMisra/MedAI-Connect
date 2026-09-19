# Changelog

All notable changes to this project are documented in this file. Entries are grouped by merged pull request, newest first. The reasoning behind each change lives in the [Development Log](docs/03-Development-Log.md).

## Unreleased

### Added
- Project documentation: rewritten README, architecture, API reference, setup and run guide, end-to-end walkthrough, PRD implementation status, milestone log.
- `backend/.env.example` and `frontend/.env.example` (a fresh clone previously had no way to know which variables were needed).

## 2026-09-18 - Doctor dashboard (#7)

### Added
- Doctor UI: login, dashboard with activation status, weekly availability editor, holiday blocking, appointments list.
- `GET /api/doctor/profile` and `GET /api/doctor/appointments`.

## 2026-09-16 - Admin dashboard (#6) and AI symptom chat (#5)

### Added
- Admin UI: verification queue, review page with the uploaded certificate, run/view AI document check, approve/reject.
- `GET /api/admin/doctors/:id/document` (admin-only certificate download).
- AI symptom-guidance chat: `ChatLog` model, `GET /api/chat/history`, `POST /api/chat/message`, `/chat` page with a permanent disclaimer.
- `OPENAI_CHAT_MODEL` setting.

## 2026-09-15 - Patient frontend (#4)

### Added
- React + Tailwind patient UI: register, login, doctor search and filter, profile with slot picker, booking, booking history.
- Public `GET /api/doctors` and `GET /api/doctors/:id`.

### Fixed
- CORS was installed but never enabled; now restricted to `FRONTEND_URL`.

## 2026-09-09 - Booking core (#3)

### Added
- `DoctorAvailability`, `Slot` and `Appointment` models; doctor availability, holiday blocking and activation endpoints; slot listing; atomic concurrency-safe booking.
- `MIN_BOOKING_AMOUNT` setting.

### Fixed (from automated review)
- Negative `slotDurationMinutes` could hang the server (infinite loop).
- A non-numeric booking `amount` bypassed validation and consumed a seat.
- Already-passed times were still bookable on the current day.

## 2026-09-06 - Doctor self-registration and AI verification (#2), review workflow (#1)

### Added
- Doctor self-registration with certificate upload; admin approve/reject; generated Login IDs.
- Doctor and patient login.
- AI document verification (`POST /api/admin/doctors/:id/verify-document`); `OPENAI_VISION_MODEL` setting.
- Claude Code review GitHub Actions workflows.

### Fixed (from automated review)
- Removed debug logging that wrote plaintext passwords to server logs.
- Approving a doctor no longer overwrites the password they chose.
- OpenAI client is created lazily so a missing key can't crash start-up.
- Removed the dead admin-creates-doctor route.
- `loginId` unique index is now sparse, so several pending doctors can coexist.

## 2026-07 - Foundation

### Added
- Patient, doctor and admin models and endpoints, JWT authentication and role middleware, admin seed script.
- Docker Compose environment (MongoDB, backend, frontend).
