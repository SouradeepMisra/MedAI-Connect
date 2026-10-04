Document Name : Product Requirement Document
Version       : 1.1
Author        : Souradeep Misra
Reviewer      : ChatGPT (Technical Architect)
Status        : Living document (requirements v1.0 unchanged; implementation status added)
Created Date  : 30 June 2026
Last Updated  : 20 September 2026

# AI-Powered Enterprise Doctor Appointment Platform

## Module

- Patient
- Doctor
- Admin

## Patient

The patient should be able to:

- Register
  - To register, need name, email address, phone number, password, re-enter password
- Login
  - Using mobile number or email address and OTP or password
- Search doctors
  - Can search doctor by entering doctor name
- Filter by specialization
  - Search doctor by filter
- View doctor profile
  - Doctor name, degree, specialization, experience, visit
- View available slots
  - Only for a month
- Book appointment
  - For booking a minimum amount is required. Booking information should display on the user profile section
- Cancel appointment
  - Cancel appointment only before 48 hours. After 48 hours no refund will get.
- Reschedule appointment
  - Reschedule based on slot availability
- View booking history
  - In user profile section
- Chat with AI
  - Based on patient symptom guide

## Doctor

Doctor should be able to:

- Login
  - Only provided userID and password by admin
- Create Dashboard
  - Add information, registration number, degree, specialization, experience
- View dashboard
  - Can view his details
- View appointments
  - Can view his appointment details in next one month like each day how many patient bookings
- Block holidays
  - Can block any calendar day for next month that is not open for patient and if any day already open to patient needs to ask admin to block that day
- Set available slots
  - Set available slots can be multiple in a day and maximum number of patients can book
- Add clinic notifications
- For the first time doctor can set slot, add holiday, block day for the current month after all profile setup and click on activate. After that doctor can edit next month information and for current month changes he needs to ask Admin.

## Admin

Admin should be able to:

- Add doctor
  - Add doctor and add his profile information like name, registration number, specialization, experience, visit
- Generate unique Id and password for doctor
- Remove doctor
- View users
  - View all patient and doctor information
- Manage appointments
  - Manage any appointment on emergency request from doctor; can delete any existing appointment slot or complete day and send user message notification
- Generate reports

---

# Implementation Status

*Added 20 September 2026. The requirements above are the original text and are left unchanged; this section records what was actually built against each one.*

Legend: ✅ done · ⚠️ partly done or deliberately changed · ❌ not built

## Patient

| Requirement | Status | Notes |
|---|---|---|
| Register (name, email, phone, password, re-enter password) | ✅ | The "re-enter password" match is checked in the UI. |
| Login with mobile/email + OTP or password | ⚠️ | Email-or-phone + **password** works. **OTP is not built**: it needs an SMS/email provider that was never set up. |
| Search doctors by name | ✅ | Case-insensitive substring. |
| Filter by specialization | ✅ | Free-text, case-insensitive exact match. |
| View doctor profile (name, degree, specialization, experience, visit) | ⚠️ | All but "visit": no consultation-fee/visit info is modelled. |
| View available slots, only for a month | ✅ | Today through 30 days ahead; already-passed times today are not offered. |
| Book appointment (minimum amount; shown on profile) | ⚠️ | Booking works and appears under *My Appointments*. The minimum amount is **validated but no real payment gateway** is integrated (`MIN_BOOKING_AMOUNT`). |
| Cancel appointment (only before 48 hours) | ❌ | Explicitly deferred. `status` already supports `Cancelled`. |
| Reschedule appointment | ❌ | Explicitly deferred. |
| View booking history | ✅ | *My Appointments*. |
| Chat with AI (symptom guide) | ✅ | One conversation per patient; non-diagnostic by design. |

## Doctor

| Requirement | Status | Notes |
|---|---|---|
| Login with ID + password provided by admin | ⚠️ | **Deliberate change.** Doctors self-register and upload a certificate; on approval the system generates the Login ID. The doctor keeps the password they chose at registration. See Development Log 7.1. |
| Create / view dashboard (registration no., degree, specialization, experience) | ✅ | Captured at registration; shown on the dashboard. |
| View appointments for the next month, with per-day counts | ⚠️ | Lists the doctor's bookings with patient name and contact. **No per-day count summary** or month filter yet. |
| Block holidays | ⚠️ | Blocking a date works. Not built: the rule that already-open days need admin action, and unblocking a date. |
| Set available slots (multiple per day, max patients) | ⚠️ | One time range per weekday plus a max-patients-per-slot value. **Multiple ranges in one day are not supported.** |
| Add clinic notifications | ❌ | No backend support exists. |
| First-time setup, then activate; afterwards next-month edits free, current-month changes via admin | ⚠️ | The *activate* step works and gates visibility to patients. The "current month locked" rule is **not enforced** (the `currentMonthLocked` field exists but nothing uses it). |

## Admin

| Requirement | Status | Notes |
|---|---|---|
| Add doctor with profile information | ⚠️ | **Replaced** by doctor self-registration + admin approval (see the Doctor login row). |
| Generate unique ID and password for doctor | ⚠️ | A unique Login ID is generated on approval (cryptographically random). The password is the doctor's own; a temporary one is only generated if a doctor somehow has none. |
| Remove doctor | ❌ | Rejecting a *pending* doctor works (record kept for audit); there is no way to remove an approved doctor. |
| View users (all patients and doctors) | ❌ | Only the pending-doctor queue and a single-doctor detail view exist. |
| Manage appointments (emergency delete, notify users) | ❌ | Not built. |
| Generate reports | ❌ | Not built. |

## Added beyond the original PRD

| Feature | Why |
|---|---|
| **AI document verification** for doctor registration | Turns onboarding into real document processing and removes the admin's manual data-entry burden; the admin still makes the final call. |
| Admin certificate viewer (authenticated, not public) | Needed for the admin to compare the AI's reading with the actual document. |
| Doctor self-registration with certificate upload | Supports the onboarding change above. **API-only today; there is no registration form in the UI.** |
| Public doctor listing/profile endpoints | Required for patients to discover doctors at all. |

## Summary

Of the 24 requirement lines above: **7 done, 10 partly done or deliberately changed, 7 not built.** Three of the ten "partly" rows are intentional design changes that deliver the same outcome by a different route (doctor login, add doctor, generate credentials, all part of the self-registration pivot); the other seven are real gaps within an otherwise working feature.

The core patient journey (find → book → history) and the doctor and admin setup that feeds it work end to end. What's missing is mostly the lifecycle and back-office side: cancel/reschedule, user management, emergency appointment handling, reports, notifications, and OTP login.
