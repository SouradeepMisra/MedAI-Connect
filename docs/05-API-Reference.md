Document Name : API Reference
Version       : 1.0
Author        : Souradeep Misra
Status        : Living document
Created Date  : 20 September 2026
Last Updated  : 20 September 2026

# API Reference

Base URL (local): `http://localhost:5000`. All request and response bodies are JSON unless noted.

## Conventions

- **Authentication.** Log in to get a JWT, then send `Authorization: Bearer <token>`. Tokens last 8 hours and carry `{ id, role }` where role is `patient`, `doctor` or `admin`.
- **Errors** are always `{ "error": "message" }`. Common codes: `400` invalid or missing input · `401` no/invalid/expired token or bad credentials · `403` valid token but wrong role · `404` not found · `409` conflict (duplicate, already decided, slot full) · `502` upstream AI call failed · `500` unexpected.
- **Dates** are `YYYY-MM-DD` and treated as **UTC** calendar days. **Times** are 24-hour `HH:mm` strings. Weekdays are numbers `0` (Sunday) to `6` (Saturday).
- **Auth column:** `-` public · `patient` / `doctor` / `admin` requires a token of that role.

## Summary

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/health` | - | Liveness check |
| `POST /api/patients/register` | - | Create a patient |
| `POST /api/auth/patient/login` | - | Patient login |
| `POST /api/auth/doctor/login` | - | Doctor login |
| `POST /api/auth/admin/login` | - | Admin login |
| `POST /api/doctors/register` | - | Doctor self-registration (multipart) |
| `GET /api/doctors` | - | Search/list bookable doctors |
| `GET /api/doctors/:id` | - | One bookable doctor's profile |
| `GET /api/appointments/slots` | - | Open slots for a doctor on a date |
| `POST /api/appointments/book` | patient | Book a slot |
| `GET /api/appointments/my` | patient | My bookings |
| `GET /api/chat/history` | patient | My AI chat history |
| `POST /api/chat/message` | patient | Send a message to the AI assistant |
| `GET /api/doctor/profile` | doctor | My full profile |
| `GET /api/doctor/appointments` | doctor | Bookings made with me |
| `GET /api/doctor/availability` | doctor | My availability template |
| `POST /api/doctor/availability` | doctor | Create/replace my template |
| `POST /api/doctor/holidays` | doctor | Block a date |
| `PATCH /api/doctor/activate` | doctor | Go live to patients |
| `GET /api/admin/doctors/pending` | admin | Verification queue |
| `GET /api/admin/doctors/:id` | admin | One doctor in full |
| `GET /api/admin/doctors/:id/document` | admin | The uploaded certificate (binary) |
| `POST /api/admin/doctors/:id/verify-document` | admin | Run the AI document check |
| `PATCH /api/admin/doctors/:id/approve` | admin | Approve a pending doctor |
| `PATCH /api/admin/doctors/:id/reject` | admin | Reject a pending doctor |

---

## Patients and authentication

### `POST /api/patients/register`
Body: `name`, `email`, `phone`, `password` (all required).
`201` → `{ message, patient: { id, name, email, phone } }`. `409` if the email or phone is already registered. The password is bcrypt-hashed and never returned.

### `POST /api/auth/patient/login`
Body: `identifier` (email **or** phone), `password`.
`200` → `{ message, token, patient: { id, name, email } }`. `401 Invalid credentials` for both unknown user and wrong password.

### `POST /api/auth/doctor/login`
Body: `loginId` (like `DOC-1A2B3C`, issued on approval), `password` (the one the doctor chose at registration).
`200` → `{ message, token, doctor: { id, name, specialization, isActivated } }`. A doctor who is still Pending has no `loginId` yet and cannot log in.

### `POST /api/auth/admin/login`
Body: `email`, `password`. `200` → `{ message, token, admin: { id, name, email } }`. Admins are not self-registrable; create one with `seedAdmin.ts`.

---

## Doctors: registration and public discovery

### `POST /api/doctors/register`  *(multipart/form-data)*
Fields: `name`, `registrationNumber`, `degree`, `specialization`, `experience` (years), `password`, and a file field named **`document`** (PDF, JPG or PNG, max 5 MB).
`201` → `{ message, doctor: { id, name, verificationStatus: "Pending" } }`. `409` if the registration number already exists. Files are stored under `backend/uploads/doctor-documents/`.

### `GET /api/doctors`
Query (both optional): `search` (case-insensitive substring of the name), `specialization` (case-insensitive exact match).
`200` → `{ doctors: [{ _id, name, degree, specialization, experience }] }`. Returns only doctors who are **Approved and Activated**.

### `GET /api/doctors/:id`
`200` → `{ doctor }` with the same fields; `404` if the doctor is unknown, not approved, or not activated.

---

## Slots and booking

### `GET /api/appointments/slots?doctorId=<id>&date=<YYYY-MM-DD>`
Public. `200` → `{ date, slots: [{ time, maxPatients, bookedCount, isFull }] }`.
`date` must be between today and 30 days ahead (`400` otherwise). Slots come from the doctor's weekly template; the list is empty on a non-working weekday or a blocked date, and for today it only includes times still in the future (UTC). `404` if the doctor isn't bookable.

### `POST /api/appointments/book`  *(patient)*
Body: `doctorId`, `date`, `time`, `amount`.
`201` → `{ message, appointment }`.
- `400`: missing fields; `amount` non-numeric or below `MIN_BOOKING_AMOUNT`; date outside the 30-day window; `time` not one of that day's open slots.
- `404`: doctor not found / not bookable.
- `409 This slot is fully booked`.

Booking is atomic: the seat is claimed with one conditional increment (`bookedCount < maxPatients`), so concurrent requests can never overfill a slot.

### `GET /api/appointments/my`  *(patient)*
`200` → `{ appointments: [{ _id, patient, doctor: { _id, name, specialization, degree }, slot, date, time, amount, status }] }` sorted by date then time. `status` is `Booked`, `Cancelled` or `Completed`.

---

## AI symptom chat  *(patient)*

### `GET /api/chat/history`
`200` → `{ messages: [{ role: "user"|"assistant", content, timestamp }] }` (empty array if the patient hasn't chatted yet).

### `POST /api/chat/message`
Body: `message` (non-empty string, max 1000 characters).
`200` → `{ reply }`. The user message and the reply are saved together. `400` for empty/too-long input. `502 Something went wrong while getting a response. Please try again.` if the AI call fails, in which case **nothing is saved**.

---

## Doctor self-service  *(doctor)*

### `GET /api/doctor/profile`
`200` → `{ doctor }`: all fields except the password (`_id`, `name`, `registrationNumber`, `degree`, `specialization`, `experience`, `loginId`, `verificationStatus`, `isActivated`, `documentPath`, `aiVerification`, ...).

### `GET /api/doctor/appointments`
`200` → `{ appointments: [{ ..., patient: { _id, name, email, phone }, date, time, amount, status }] }`.

### `GET /api/doctor/availability`
`200` → `{ availability: { weeklySchedule, slotDurationMinutes, maxPatientsPerSlot, blockedDates } }`; `404` if no template has been saved yet.

### `POST /api/doctor/availability`
Replaces the whole template.
Body: `weeklySchedule: [{ dayOfWeek, startTime, endTime }]` (non-empty), optional `slotDurationMinutes` (default 15, must be ≥ 1) and `maxPatientsPerSlot` (default 1, must be ≥ 1).
`200` → `{ message, availability }`.

### `POST /api/doctor/holidays`
Body: `date`. Adds the day to `blockedDates` (idempotent). `200` → `{ message, blockedDates }`. `400` if no availability template exists yet. There is no endpoint to unblock a date.

### `PATCH /api/doctor/activate`
Makes the doctor visible and bookable. `400` if no availability template exists. `200` → `{ message, isActivated: true }`.

---

## Admin: doctor verification  *(admin)*

### `GET /api/admin/doctors/pending`
`200` → `{ doctors: [{ _id, name, registrationNumber, degree, specialization, experience, documentPath, createdAt, aiVerification: { status } }] }`.

### `GET /api/admin/doctors/:id`
`200` → `{ doctor }` (everything except the password, including the full `aiVerification`).

### `GET /api/admin/doctors/:id/document`
Streams the uploaded certificate with the right `Content-Type` (`image/jpeg`, `image/png`, `application/pdf`). Admin-only on purpose: these are sensitive documents and the uploads folder is not served publicly. `404` if the doctor or file is missing.

### `POST /api/admin/doctors/:id/verify-document`
Runs the AI check on demand and stores the result on the doctor (re-running overwrites it). Never changes approval status.
`200` → `{ message, aiVerification }` where `aiVerification` is:

```jsonc
{
  "status": "Completed",                  // "NotRun" | "Completed" | "Failed"
  "modelUsed": "gpt-4o",
  "extractedName": "...", "extractedRegistrationNumber": "...", "extractedDegree": "...",
  "nameMatch": "match", "registrationNumberMatch": "uncertain", "degreeMatch": "mismatch",   // match | mismatch | uncertain
  "concerns": ["text partially illegible"],
  "summary": "plain-language note for the admin",
  "errorMessage": null,                    // set when status is "Failed"
  "checkedAt": "2026-09-20T10:00:00.000Z"
}
```

A failure (bad API key, network, unsupported file type such as PDF) is returned as `status: "Failed"` with an `errorMessage`, not as an HTTP error.

### `PATCH /api/admin/doctors/:id/approve`
Generates a unique `loginId` and sets status to `Approved`. `200` → `{ message, doctor: { id, name, loginId }, temporaryPassword? }`. `temporaryPassword` is present only if the doctor somehow had no password of their own (self-registered doctors always do). `409` if the doctor is not `Pending`.

### `PATCH /api/admin/doctors/:id/reject`
Sets status to `Rejected` (the record is kept for audit). `200` → `{ message, doctor: { id, name } }`. `409` if not `Pending`.

---

## Health

### `GET /api/health`
`200` → `{ "status": "ok", "service": "medai-connect-backend" }`.
