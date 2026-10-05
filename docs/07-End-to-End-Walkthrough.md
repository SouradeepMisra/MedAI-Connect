Document Name : End-to-End Walkthrough
Version       : 1.1
Author        : Souradeep Misra
Status        : Living document
Created Date  : 20 September 2026
Last Updated  : 5 October 2026

# End-to-End Walkthrough

One complete pass through the product, across all three roles, in the order things have to happen. Assumes the stack is running and the admin is seeded ([Setup & Run Guide](06-Setup-and-Run-Guide.md)).

## The flow at a glance

```mermaid
sequenceDiagram
    autonumber
    actor D as Doctor
    actor A as Admin
    actor P as Patient
    participant S as MedAI Connect

    D->>S: Register + upload certificate (UI form)
    Note over S: Doctor status = Pending
    A->>S: Open pending queue, view certificate
    A->>S: (optional) Run AI verification
    S-->>A: match / mismatch / uncertain per field
    A->>S: Approve
    S-->>A: Doctor's Login ID
    D->>S: Log in (Login ID + own password)
    D->>S: Set weekly availability, block holidays
    D->>S: Add a profile photo and bio
    D->>S: Activate profile
    Note over S: Doctor is now visible and bookable
    P->>S: Register, log in
    P->>S: Search doctor, pick date and slot
    P->>S: Book (atomic seat claim)
    S-->>P: Appointment booked + confirmation email
    D->>S: See the booking under Appointments
    P->>S: Chat with the AI symptom assistant
    P->>S: Cancel the booking (>=48h ahead)
    S-->>P: Appointment cancelled, seat released
```

A doctor appears on the patient site only when they are **Approved by an admin *and* Activated by themselves**. Before either step, they are invisible and unbookable.

---

## Part 1: Using the web UI

### Step 1: Doctor registers

Open http://localhost:5173/doctor/register and fill in name, registration number, degree, specialization, years of experience, a password, and upload any JPG/PNG/PDF as the "certificate". Submit — the account is created with `verificationStatus: "Pending"` and you're told to wait for admin approval. The doctor chose their own password here; approval does not replace it.

### Step 2: Admin reviews and approves

1. Open http://localhost:5173/admin/login and sign in as `admin@medai.com` / `ChangeThisPassword123`.
2. The **Pending Doctor Verifications** queue lists the doctor with an *AI check: NotRun* badge. Open them.
3. The review page shows the submitted profile next to the **uploaded certificate**.
4. *(Optional, needs an OpenAI key)* Click **Run AI Verification**. You get a match / mismatch / uncertain badge for name, registration number and degree, what the model actually read from the document, any concerns, and a summary. Without a key you'll see a red `401 Incorrect API key` message, which is the designed failure state. You can still decide without it.
5. Click **Approve**. A green callout shows the doctor's **Login ID** (like `DOC-1A2B3C`). **Copy it**: it is how the doctor logs in. (A temporary password appears here only in the rare case a doctor has no password of their own.)
   *Reject* keeps the record but marks it Rejected.

### Step 3: Doctor sets up and activates

1. Open http://localhost:5173/doctor/login, enter the Login ID and the password from step 1.
2. The dashboard shows the profile and **Activation Status**. The **Activate** button is disabled and asks for availability first.
3. Go to **Availability**. Tick the days the doctor works, set start/end times, choose **Slot duration** (minutes) and **Max patients per slot**, and click **Save Availability**.
4. Optionally pick a date under **Blocked Dates** and click **Block this date**. No slots will be offered that day.
5. Optionally go to **Edit Profile** and upload a photo plus a short bio — this is what patients see on the doctor list and profile page instead of a bare initials circle.
6. Back on the **Dashboard**, click **Activate**. The badge turns green: *Activated, patients can book appointments with you*.

### Step 4: Patient finds and books

1. Open http://localhost:5173/register, create an account (name, email, phone, password, re-enter password), then log in at `/login`.
2. On **Find a Doctor**, the new doctor now appears. Try the name search and the specialization filter.
3. Open the doctor. Pick a date (today through 30 days ahead). Slots that already passed today, blocked dates and non-working days show no slots; full slots are greyed out.
4. Click a slot, keep or change the **Booking Amount** (must be at least `MIN_BOOKING_AMOUNT`, default 100), and click **Confirm Booking**. You'll see *Appointment booked!* — and, if `BREVO_API_KEY` is configured (see [Setup & Run Guide §4a](06-Setup-and-Run-Guide.md#4a-email-brevo)), a confirmation email.
5. **My Appointments** lists it with doctor, date, time, amount and a *Booked* badge.

### Step 5: Both sides see the booking

- As the doctor, open **Appointments**: the patient's name, date/time and contact number are there.
- As the patient, open **AI Symptom Chat**, describe a symptom, and read the reply. Try something alarming like "chest pain and trouble breathing": the assistant is instructed to tell you to seek emergency care immediately. Reload the page and the conversation is still there.

### Step 6: Patient cancels the booking

Back on **My Appointments**, a booking more than 48 hours out shows a **Cancel appointment** button. Click it, confirm the prompt, and the badge flips to *Cancelled* — the slot is freed up for other patients to book. A booking within 48 hours (or already in the past) shows no Cancel button; the API rejects it the same way if attempted directly.

### Step 7 (if you ever need it): forgot password

From **Log in**, click **Forgot password?**, enter the patient's email, and submit — the response is the same generic "if an account exists..." message either way, so it never reveals whether that email is registered. If `BREVO_API_KEY` is configured, a real reset link arrives by email; it's valid for 1 hour and can only be used once.

### Things worth trying (edge cases the system handles)

| Try this | Expect |
|---|---|
| Book with an amount below the minimum, or non-numeric | `A minimum booking amount of 100 is required`, and no seat is consumed |
| Book a slot that's full (set *Max patients per slot* to 1 and book it twice) | `This slot is fully booked` |
| Two browsers click the last seat at the same instant | exactly one succeeds, the other gets the "fully booked" message |
| Two browsers cancel the same booking at the same instant | exactly one succeeds, the other gets a `409` |
| Try to cancel a booking less than 48 hours away | `400 Appointments can only be cancelled at least 48 hours in advance`, and the UI doesn't even show the Cancel button for it |
| Open `/admin` while logged out | redirected to `/admin/login` |
| Open `/admin` with a stale/expired token still in localStorage | automatically cleared and redirected to `/admin/login`, instead of a stuck error page |
| Use a patient token on a doctor/admin API | `403 You do not have permission` |
| Send a chat message with an invalid OpenAI key | clean inline error; nothing is saved to the history |
| Request a password reset for an email that isn't registered | same generic "if an account exists..." message as a real one |

---

## Part 2: The same flow through the API

Handy for scripting or when you want to see exactly what the UI sends. Replace `<...>` with values from earlier responses. Full details for every endpoint: [API Reference](05-API-Reference.md).

Pick a date to test with. Use **tomorrow** so today's already-passed times don't confuse you:

```bash
DATE=$(date -u -d "+1 day" +%F)                # Linux / Git Bash
# PowerShell: $DATE = (Get-Date).ToUniversalTime().AddDays(1).ToString("yyyy-MM-dd")
```

**1. Admin logs in**
```bash
curl -s -X POST http://localhost:5000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@medai.com","password":"ChangeThisPassword123"}'
# -> copy "token"  = <ADMIN_TOKEN>
```

**2. Register the doctor**, then **list the pending queue**
```bash
curl -X POST http://localhost:5000/api/doctors/register \
  -F "name=Sarah Chen" \
  -F "registrationNumber=MC-2024-001" \
  -F "degree=MBBS, MD" \
  -F "specialization=Cardiology" \
  -F "experience=9" \
  -F "password=DoctorPass123" \
  -F "document=@./certificate.jpg;type=image/jpeg"
# -> expect 201 and "verificationStatus":"Pending"

curl -s http://localhost:5000/api/admin/doctors/pending -H "Authorization: Bearer <ADMIN_TOKEN>"
# -> copy the doctor's "_id" = <DOCTOR_ID>
```

**3. (Optional) run the AI check, then approve**
```bash
curl -s -X POST http://localhost:5000/api/admin/doctors/<DOCTOR_ID>/verify-document -H "Authorization: Bearer <ADMIN_TOKEN>"
curl -s -X PATCH http://localhost:5000/api/admin/doctors/<DOCTOR_ID>/approve -H "Authorization: Bearer <ADMIN_TOKEN>"
# -> copy "doctor.loginId"  = <LOGIN_ID>
```

**4. Doctor logs in, sets availability (all 7 days, 09:00-17:00, 30-minute slots, 2 patients each), activates**
```bash
curl -s -X POST http://localhost:5000/api/auth/doctor/login \
  -H "Content-Type: application/json" \
  -d '{"loginId":"<LOGIN_ID>","password":"DoctorPass123"}'
# -> copy "token"  = <DOCTOR_TOKEN>

curl -s -X POST http://localhost:5000/api/doctor/availability \
  -H "Authorization: Bearer <DOCTOR_TOKEN>" -H "Content-Type: application/json" \
  -d '{"weeklySchedule":[
        {"dayOfWeek":0,"startTime":"09:00","endTime":"17:00"},
        {"dayOfWeek":1,"startTime":"09:00","endTime":"17:00"},
        {"dayOfWeek":2,"startTime":"09:00","endTime":"17:00"},
        {"dayOfWeek":3,"startTime":"09:00","endTime":"17:00"},
        {"dayOfWeek":4,"startTime":"09:00","endTime":"17:00"},
        {"dayOfWeek":5,"startTime":"09:00","endTime":"17:00"},
        {"dayOfWeek":6,"startTime":"09:00","endTime":"17:00"}],
       "slotDurationMinutes":30,"maxPatientsPerSlot":2}'

curl -s -X PATCH http://localhost:5000/api/doctor/activate -H "Authorization: Bearer <DOCTOR_TOKEN>"
```

**5. Patient registers, logs in, finds the doctor and their slots**
```bash
curl -s -X POST http://localhost:5000/api/patients/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Patient","email":"patient@example.com","phone":"9876543210","password":"PatientPass123"}'

curl -s -X POST http://localhost:5000/api/auth/patient/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"patient@example.com","password":"PatientPass123"}'
# -> copy "token"  = <PATIENT_TOKEN>

curl -s "http://localhost:5000/api/doctors?search=Sarah"
curl -s "http://localhost:5000/api/appointments/slots?doctorId=<DOCTOR_ID>&date=$DATE"
```

**6. Book, then see it from both sides**
```bash
curl -s -X POST http://localhost:5000/api/appointments/book \
  -H "Authorization: Bearer <PATIENT_TOKEN>" -H "Content-Type: application/json" \
  -d "{\"doctorId\":\"<DOCTOR_ID>\",\"date\":\"$DATE\",\"time\":\"09:00\",\"amount\":150}"

curl -s http://localhost:5000/api/appointments/my   -H "Authorization: Bearer <PATIENT_TOKEN>"
curl -s http://localhost:5000/api/doctor/appointments -H "Authorization: Bearer <DOCTOR_TOKEN>"
# -> copy the appointment's "_id" = <APPOINTMENT_ID>
```

**7. Talk to the AI assistant** *(needs an OpenAI key)*
```bash
curl -s -X POST http://localhost:5000/api/chat/message \
  -H "Authorization: Bearer <PATIENT_TOKEN>" -H "Content-Type: application/json" \
  -d '{"message":"I have had a mild headache since this morning. What should I do?"}'
curl -s http://localhost:5000/api/chat/history -H "Authorization: Bearer <PATIENT_TOKEN>"
```

**8. Cancel the booking** (only works 48h+ before the slot — `$DATE` above is tomorrow, so this will likely 400; book further out to actually see it succeed)
```bash
curl -s -X PATCH http://localhost:5000/api/appointments/<APPOINTMENT_ID>/cancel \
  -H "Authorization: Bearer <PATIENT_TOKEN>"
```

**9. Forgot/reset password** *(needs `BREVO_API_KEY` configured)*
```bash
curl -s -X POST http://localhost:5000/api/auth/patient/forgot-password \
  -H "Content-Type: application/json" -d '{"email":"patient@example.com"}'
# -> check the inbox for the reset link, copy its "?token=" value = <RESET_TOKEN>

curl -s -X POST http://localhost:5000/api/auth/patient/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"<RESET_TOKEN>","password":"NewPatientPass123"}'
```

## Clean up after a demo

```bash
docker compose exec mongodb mongosh medai-connect --eval 'db.doctors.deleteMany({}); db.patients.deleteMany({}); db.appointments.deleteMany({}); db.slots.deleteMany({}); db.doctoravailabilities.deleteMany({}); db.chatlogs.deleteMany({})'
```

This keeps the admin. Uploaded certificates and photos stay in `backend/uploads/doctor-documents/` and `backend/uploads/doctor-photos/`; delete those files by hand if you want them gone.
