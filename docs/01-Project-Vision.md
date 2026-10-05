Document Name : Project Vision
Version       : 2.1
Author        : Souradeep Misra
Reviewer      : ChatGPT (Technical Architect)
Status        : Living document (v1 delivered, v1.1 adds the first round of end-user-requested features)
Created Date  : 30 June 2026
Last Updated  : 5 October 2026

# Project Name

MedAI Connect

---

## Vision

MedAI Connect is an AI-powered enterprise healthcare appointment platform that enables patients to discover doctors, book appointments, manage schedules, and receive AI-assisted healthcare guidance while providing doctors and administrators with efficient scheduling and management tools.

---

## Problem Statement

Today many clinics still rely on phone calls or manual registers for appointment booking.

Patients struggle to

- find doctors
- know available slots
- receive reminders

Doctors struggle to

- manage schedules
- avoid double booking
- communicate with patients

---

## Target Users

- Patient
- Doctor
- Hospital Admin

---

## Project Goal

Build a scalable healthcare appointment platform using React, Node.js, MongoDB, Docker and AI integration.

> **Change from the original draft:** this said *Angular*. The stack moved to **React** early in the build so the project would demonstrate the React skills being developed while leaning on existing Node/MongoDB/Docker strength. The reasoning is in [Development Log section 1](03-Development-Log.md#1-stack-decision).

---

## Guiding principles

These shaped the decisions recorded in the [Development Log](03-Development-Log.md):

1. **AI assists, a human decides.** AI reads a certificate and flags mismatches for an admin; it does not approve doctors. The symptom assistant gives general guidance and always points to a real doctor. No autonomous decisions on anything medical.
2. **Correctness where it matters.** Double booking is the classic failure of an appointment system, so booking is a single atomic database operation rather than check-then-write.
3. **Simple and defensible over clever.** Plain `fetch` + Context instead of a state-management stack, on-demand AI calls instead of automatic ones, tightly scoped PRs.
4. **Honest about limits.** Mocked payment, no OTP, no reschedule: each is written down, not hidden.

## What has been delivered (v1)

| Area | Delivered |
|---|---|
| Patient | Register/login (plus forgot/reset password by email), doctor search and filter, profile, slot browsing (30 days), booking with an email receipt, booking history, cancel a booking (48-hour rule), AI symptom-guidance chat |
| Doctor | Self-registration with certificate upload **in the UI**, approved login, dashboard with a photo and bio, weekly availability and holiday blocking, activation, appointment list |
| Admin | Verification queue, certificate viewer, on-demand AI document check, approve/reject |
| Platform | Concurrency-safe booking *and* cancellation *and* approval, role-based JWT auth (fail-fast on a missing secret), automatic session recovery on an expired token, Docker Compose environment, automated AI code review on every PR |

Requirement-by-requirement status is in the [Product Requirement Document](02-Product-Requirement-Document.md#implementation-status); how the pieces fit together is in [Architecture](04-Architecture.md).

## What is next

Reschedule, patient OTP login, the remaining admin tools (an "all doctors" page, user directory, emergency appointment management, reports), automated tests, and a public deployment. See the README roadmap.
