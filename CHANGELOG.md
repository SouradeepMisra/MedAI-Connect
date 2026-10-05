# Changelog

All notable changes to this project are documented in this file. Entries are grouped by merged pull request, newest first. The reasoning behind each change lives in the [Development Log](docs/03-Development-Log.md).

## 2026-10-05 - Session-expiry auto-recovery (#18)

### Fixed
- A stale/expired token in localStorage let a user reach a protected page, which then just failed with a raw 401 error and no way back to the login page. Any 401 now clears that role's stored session and redirects to its login page automatically.

## 2026-10-05 - Booking confirmation email receipt (#17)

### Added
- A booking confirmation email (doctor, date, time, amount, cancellation-policy reminder) is sent via Brevo when a patient books. Non-blocking: a send failure is logged, never surfaces to the client or affects the booking response.

## 2026-10-05 - Doctor photo + bio (#16)

### Added
- Doctors can set a profile photo and bio from their dashboard (`PATCH /api/doctor/profile`, multipart). Shown on the public doctor list, doctor cards, and profile page; falls back to an initials avatar when unset.

## 2026-10-05 - Cancel appointment, 48-hour rule (#15)

### Added
- `PATCH /api/appointments/:id/cancel` (patient-only). Rejects within 48 hours of the appointment or if it's not currently `Booked`; releases the slot's seat on success. `MyAppointmentsPage` shows a Cancel button only on appointments more than 48 hours out.

## 2026-10-05 - UI polish (#14)

### Changed
- Consistent teal brand accent across the app (buttons, links, focus rings, active nav state), replacing ad-hoc black/slate. Added a shared footer, initials avatars on doctor cards, and styled empty/error states.

## 2026-10-05 - Auth-context consolidation (#12)

### Changed
- `AuthContext`, `AdminAuthContext` and `DoctorAuthContext` were three copies of the same ~60-line implementation; extracted into one `createAuthContext<TUser>(storageKey)` factory. No change to any hook name, returned field, or behavior.

## 2026-10-05 - Forgot password via email (#13)

### Added
- Patient-only forgot/reset password flow (`POST /api/auth/patient/forgot-password`, `POST /api/auth/patient/reset-password`), emailed via Brevo's transactional API. Single-use, 1-hour-expiry token stored as a sha256 hash, never the raw token. No user enumeration: the forgot-password response is identical whether or not the email matches an account.

## 2026-10-05 - Security and concurrency fixes (#11)

### Fixed
- `JWT_SECRET` silently defaulted to `''` if unset, meaning a missing env var was a full auth bypass. The server now fails fast at startup instead.
- Admin approve/reject, the first chat message, and the first availability save were all non-atomic read-then-write races; rewritten as atomic conditional updates/upserts.
- Doctor search/specialization query params went straight into `$regex` unescaped, letting a malformed value 500 a public endpoint. Now escaped.

## 2026-10-05 - Doctor registration UI (#10)

### Added
- A doctor registration form in the UI (`/doctor/register`) — self-registration was previously API-only.

### Fixed
- Uploaded document filenames were derived from the client-supplied `originalname` (path traversal risk); now derived from a validated mimetype plus a random suffix.
- An unhandled file-upload error (wrong type, too large) could leak a raw stack trace; now returns a clean `400`.

## 2026-10-04 - Configurable AI provider (#9)

### Added
- `OPENAI_BASE_URL` setting so the existing OpenAI SDK client can point at any OpenAI-compatible endpoint. Verified live against a real, free Google Gemini key for both AI features (document verification and symptom chat).

## 2026-10-04 - Documentation pass (#8)

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
