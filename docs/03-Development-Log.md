Document Name : Development Log
Version       : 2.1
Author        : Souradeep Misra
Status        : Living document (update as the project progresses)
Created Date  : 18 July 2026
Last Updated  : 5 October 2026

# Development Log — MedAI Connect

This document tracks **what was built, in what order, and why** — the reasoning behind each
decision, not just the steps. Code comments explain *why a specific line exists*; this doc
explains *why we chose this approach over alternatives*. Update this file every time a
meaningful architectural or tooling decision is made.

---

## 1. Stack decision

**Chosen stack:** React (frontend) + Node.js/Express + TypeScript (backend) + MongoDB (database) + Docker.

**Why not the originally-considered React + .NET stack:**
The resume already shows 6 years of Angular/Node/MongoDB/Docker experience, with React listed
as a skill currently being expanded. A React + .NET project would introduce two unfamiliar
ecosystems at once, be slower to build, and harder to defend confidently in an interview.
Instead:
- **Frontend: React** — proves the "expanding into React" claim on the resume with real evidence, and widens the pool of roles this project is relevant for (React has broader job-market reach than Angular in most markets).
- **Backend: Node.js/Express** — plays directly to the strongest, most defensible existing experience.
- **Database: MongoDB** — matches both the resume and the original PRD for this project (MedAI Connect).
- **Docker** — already a resume skill; containerizing this project turns a bullet point into a demonstrable artifact.

**Domain:** Healthcare appointment booking (MedAI Connect) — chosen over a generic ticketing
app because it's relatable to interviewers, has enough real business rules to showcase
non-trivial design decisions, and leans naturally into the AI-assisted-development narrative
that's the resume's stated differentiator.

---

## 2. Local environment setup

| Tool | Version installed | Why this version |
|---|---|---|
| Node.js | 24.x (LTS, codename "Krypton") | Node 24 is the current Active LTS as of mid-2026. Node 26 exists but is still the experimental "Current" line until it becomes LTS in October 2026 — not suitable for a project meant to look production-standard. |
| npm | bundled with Node 24 | — |
| Docker Desktop | latest | Needed to run MongoDB, backend, and frontend as isolated, consistent containers regardless of host machine differences. |
| VS Code | latest | Primary editor. |

**Issue hit — `node`/`npm`/`docker` "not recognized":**
Cause: the terminal window was opened *before* the installer finished updating Windows' PATH
environment variable. Fix: close and reopen the terminal (or restart VS Code) so it picks up
the refreshed PATH. This is a Windows-specific quirk, not a broken install.

**Issue hit — Docker Desktop "Virtualization support not detected":**
Cause: the CPU's virtualization feature (Intel VT-x / AMD-V) was disabled in BIOS/UEFI. Docker
Desktop on Windows runs Linux containers inside a lightweight virtual machine (via WSL2), and
that requires virtualization to be enabled at the hardware level. Fix: enabled virtualization
in BIOS, confirmed WSL2 was installed/updated (`wsl --install`, `wsl --update`), restarted the
machine. Docker Desktop started normally afterward.

---

## 3. Project folder structure

```
MedAI-Connect/
├── .github/workflows/     → CI pipeline definition (ci.yml)
├── backend/               → Express + TypeScript API, its own package.json
│   ├── src/
│   ├── tests/
├── database/
│   └── migrations/, seed.js  → will hold sample data seeding scripts
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
├── docs/                  → living project documentation (this file included)
├── frontend/              → React + Vite + TypeScript app, its own package.json
├── postman/               → API request collections, doubles as living API docs
├── screenshots/           → visual proof of working features, for README/resume use
├── shared/
│   └── types.ts           → TypeScript types shared between frontend and backend
├── docker-compose.yml     → orchestrates all three services together
├── CHANGELOG.md, CONTRIBUTING.md, LICENSE, README.md
```

**Why `backend/` and `frontend/` each have their own `package.json`:**
They are independent Node projects with different dependencies (Express/Mongoose on one side,
React/Vite on the other). Keeping them isolated means each can be built, tested, and
containerized separately — mirrors how real multi-service projects are structured.

**Why `shared/types.ts` exists:**
So both frontend and backend agree on the shape of core data (e.g. what fields an `Appointment`
has) without duplicating the definition in two places and letting them drift out of sync.

> **Update (20 Sept 2026): the layout above was the plan; the real repo differs.** `postman/` and
> `screenshots/` were never created. `shared/types.ts` and `database/seed.js` are unused
> placeholder stubs (their shapes don't match the real models, and nothing imports them), so the
> frontend defines its own types in `frontend/src/types.ts`. There is no `.github/workflows/ci.yml`;
> the only workflows are the two Claude Code review actions. The accurate, current tree is in the
> [README](../README.md#project-structure).

---

## 4. Backend dependencies — what and why

| Package | Role |
|---|---|
| `express` | The web server — receives HTTP requests, sends responses. |
| `mongoose` | ODM (Object-Document Mapper) for MongoDB — lets us define a schema/shape for data instead of writing raw queries by hand. |
| `dotenv` | Loads secrets (DB connection string, JWT secret, API keys) from a `.env` file instead of hardcoding them. |
| `cors` | Allows the frontend (port 5173) to make requests to the backend (port 5000) — browsers block cross-origin requests by default for security. |
| `jsonwebtoken` | Issues signed tokens after login so the server can verify a user's identity on later requests without re-checking the password every time. |
| `bcryptjs` | Hashes passwords before storing them, so raw passwords are never saved in the database. |
| `openai` | Official SDK for calling OpenAI's models — powers the AI symptom-guidance chat feature. |
| `typescript` | Adds type-checking to JavaScript, catching mistakes (wrong data types, typos in property names) before the code even runs. |
| `ts-node-dev` | Runs TypeScript directly during development (no manual compile step) and auto-restarts the server on file changes. |

**Decision — `bcryptjs` over `bcrypt`:**
The native `bcrypt` package requires compiling C++ code on install (via `node-gyp`), which can
fail on Windows machines without build tools installed. `bcryptjs` is a pure-JavaScript
implementation with an identical API — no native compilation, no Windows-specific setup
headaches, negligible performance difference for a project at this scale.

**Decision — TypeScript downgraded from 7.x to 5.9:**
TypeScript 7 introduced a fully rewritten (Go-based) compiler with major internal changes.
`ts-node` (a dependency of `ts-node-dev`) has not yet been updated to work with TS 7's new
internals, causing a startup crash (`Cannot read properties of undefined (reading 'fileExists')`).
Downgrading to TypeScript 5.9 — still fully current and widely supported — resolved this. This
is a normal, temporary ecosystem lag, not a project-specific bug; will revisit upgrading once
`ts-node`/`ts-node-dev` officially support TS 7.

---

## 5. Docker setup

**Why Docker at all:**
Ensures the app behaves identically regardless of whose machine it runs on (the "works on my
machine" problem) — the exact Node version, dependencies, and configuration travel with the
app inside containers instead of depending on what's installed locally.

**Why three separate containers (not one):**
Mirrors how real systems are deployed — database, backend, and frontend are independent
services that can fail, scale, or redeploy separately. Also makes it easy to explain "how does
your app get from your laptop to production" in an interview.

**`docker-compose.yml`** — orchestrates all three services with one command (`docker compose up`)
instead of starting each manually. Key details worth remembering:
- Inside Docker's internal network, containers reach each other **by service name**, not
  `localhost` — e.g. the backend connects to MongoDB using `mongodb://mongodb:27017/...`,
  where `mongodb` is the service name defined in the compose file, not an actual hostname.
- Bind-mounting the source folders (`./backend:/app`, `./frontend:/app`) means local file edits
  are reflected inside the container immediately — needed for `ts-node-dev`'s hot-reload during
  development.
- Excluding `node_modules` from that mount (`/app/node_modules`) prevents the host machine's
  `node_modules` from overwriting the one installed inside the container (which may differ,
  e.g. Windows vs. Linux binary differences).

**Running as TypeScript directly (via `ts-node-dev`) rather than compiling to JS first:**
Deliberate simplification for now — avoids adding a build step on top of everything else being
learned at once. Documented decision: revisit and add a proper compiled production build stage
once the app works end-to-end.

### 5.1 Debugging notes — patient registration endpoint (18 July 2026)

**Issue 1 — new route returned 404 despite correct code:**
Created `patientRoutes.ts` and updated `index.ts` to wire it in, but calling
`POST /api/patients/register` returned `Cannot POST /api/patients/register`. On review, both
files were correct — the actual cause was that `ts-node-dev`'s file-watcher never picked up the
change. Windows-to-Docker bind mounts (`./backend:/app`) don't reliably deliver native
file-change notifications across the Windows → WSL2 → Linux container boundary, especially for
newly created files. The container kept running its previous in-memory version of `index.ts`.

**Fix:** added `CHOKIDAR_USEPOLLING=true` to the backend service's environment variables, which
makes the watcher actively poll for file changes on an interval instead of relying on native
OS notifications. Slightly less efficient, but reliable in this Windows+Docker setup.

**Issue 2 — the polling fix didn't take effect on the first attempt:**
The `environment:` block containing `CHOKIDAR_USEPOLLING=true` was added at the very bottom of
`docker-compose.yml`, outside any service definition — a sibling to `services:` and `volumes:`
rather than nested inside `backend:`. In YAML, indentation defines structure; an unindented
block at the file's root is a separate top-level key, which Docker Compose doesn't recognize
and silently ignores (no error is raised for unknown top-level keys). Lesson: YAML mistakes
like this fail silently rather than throwing an error, so structure/indentation is worth
double-checking whenever a config change doesn't seem to take effect.

**Fix:** merged `CHOKIDAR_USEPOLLING=true` into the existing `environment:` list already nested
under the `backend:` service, rather than creating a second, separate `environment:` key.

**Issue 3 — renaming the project folder (`MedAI-Connect1` → `MedAI-Connect`) didn't update
Docker's references:**
Docker Compose automatically names containers, images, and its internal project grouping based
on the folder name at the time `docker compose up` is first run (e.g. `medai-connect1-backend-1`).
Renaming the folder afterward doesn't rename anything Docker already created — the old
containers/images remained, disconnected from the renamed folder.

**Fix:** ran `docker compose down` from the new folder path, pruned the old, now-unused
containers and images (`docker container prune`, `docker image prune`, plus explicit `docker rm`
for anything not caught by prune), then rebuilt fresh with `docker compose up --build` — this
created new containers correctly namespaced under `medai-connect`.

**Outcome:** `POST /api/patients/register` now returns `201 Created` with a real MongoDB-generated
`_id`, confirming the full chain (Express → Mongoose → MongoDB) works end-to-end.

---

## 6. Backend ↔ MongoDB connection

The backend waits for a successful MongoDB connection **before** starting to accept HTTP
requests (rather than starting the server immediately and connecting in the background). If the
database isn't reachable, the process logs the error and exits rather than running in a broken,
silently-failing state. Standard practice: never accept requests you can't actually fulfil.

**Status update (18 July 2026):** Backend successfully connects to MongoDB on startup, confirmed
via logs (`MongoDB connected successfully`). Connection flow works as designed — the server only
starts listening after the database connection succeeds.

---

## 7. MongoDB schema design

**Core design principle used throughout: embed vs. reference.**
- **Embed** data that always belongs together, is read as a whole, and doesn't grow unbounded
  (example: individual messages inside a single chat conversation).
- **Reference** (store just an ID, keep as a separate collection) data that grows over time, or
  that needs to be queried independently of its "parent" (example: appointments — need to be
  queried both "by patient" and "by doctor" independently, and grow endlessly over time).

| Collection | Embed or reference? | Reasoning |
|---|---|---|
| `patients` | — | Base entity, no nested growth. |
| `doctors` | — | Base entity. Includes `isActivated` / `currentMonthLocked` flags per the PRD's first-time-setup and current-month-lock business rules. |
| `doctorAvailability` | Rule/template, not per-slot | Stores the doctor's recurring time-range + break rules (e.g. 10 AM–5 PM, lunch 1–2 PM) rather than pre-generating every 15-minute slot for a month in advance — keeps the database lean; actual time slots are generated on demand. |
| `slots` | Referenced from `doctorAvailability` | Only created in the database the *first time* a specific date+time is actually booked into — not pre-created for every possible time chunk. |
| `appointments` | References both `patients` and `doctors` | Needs independent querying from both directions ("this patient's history" and "this doctor's schedule"); grows without bound over time. |
| `chatlogs` | Messages embedded inside the conversation document | A conversation is always read as a whole; messages are small and never queried individually across conversations. |
| `admins` | — | Small, simple collection. |

**Concurrency-safe booking (`bookedCount`):**
Booking a slot uses an **atomic `findOneAndUpdate`** with a condition (`bookedCount < maxPatients`)
combined with an atomic `$inc`, rather than a separate "check availability" step followed by a
separate "save booking" step. This prevents a race condition where two patients booking the
same last-available slot at nearly the same instant could both succeed, over-booking the slot.
This pattern (check-and-update in one atomic operation) is the standard approach used in
real booking/ticketing systems.

**Phased build plan for slot generation (to avoid building everything at once):**
1. Phase 1 — hardcode a doctor's availability manually; get booking + atomic increment working end-to-end first.
2. Phase 2 — add the `doctorAvailability` template and auto-generate 15-minute slots from it.
3. Phase 3 — add the `breaks` array (lunch/personal time blocking) to the generation logic.

### 7.1 Design pivot — doctor onboarding (updated after initial build)

**Original PRD:** doctors are created exclusively by the admin, who generates their login ID
and password.

**Revised approach:** doctors self-register (name, registration number, degree, specialization,
experience) and upload a supporting document (registration/degree certificate). An AI/OCR step
extracts details from the uploaded document and cross-checks them against the submitted form
data, flagging mismatches. The doctor account is created in a `Pending` status; an admin
reviews the AI's extraction and flags, then makes the final approve/reject decision.

**Why:** removes the admin bottleneck for onboarding at scale (more realistic of how real
platforms like Practo grow), and turns the AI feature set into genuine document-processing
work rather than only a chat interface — a stronger differentiator for the project overall.

**Why not fully automated verification:** no public API exists for real medical registry
verification in most jurisdictions, so this is necessarily a simulated check (matching
extracted document text against form input) rather than confirmation against a government
database. Automated approval of medical credentials without human review would also be
irresponsible even if a real registry API existed — a human admin makes the final call in
every case; AI only assists that decision.

**Sequencing:** built in phases — (1) self-registration + document upload with manual admin
review, (2) add AI/OCR extraction shown to the admin, (3) add automatic mismatch flagging.

### 7.2 Debugging notes — doctor self-registration with file upload (18 July 2026)

Building the self-registration endpoint (`POST /api/doctors/register`, multipart form with a
document upload via Multer) surfaced three separate, layered issues before it worked correctly.

**Issue 1 — `400 All fields are required` despite every field being filled in Postman:**
Cause: a manually-set `Content-Type` header (left over from an earlier JSON-based request)
was present, preventing Postman from sending the correct auto-generated multipart boundary.
Without a valid boundary, Multer couldn't parse the incoming form at all, so every field in
`req.body` came back empty.

**Issue 2 — new error, `Cannot destructure property 'name' of req.body as it is undefined`,
after "fixing" issue 1:**
Cause: the fix for Issue 1 disabled the *correct* auto-generated `Content-Type` header
(mistaking it for a stray duplicate), rather than removing an actual duplicate. With no
`Content-Type`/boundary sent at all, Multer skipped parsing entirely, leaving `req.body`
completely undefined rather than an empty object. Lesson: on multipart requests, Postman's
auto-generated `Content-Type` header (containing the boundary) must stay enabled — it should
never be manually edited or disabled.

**Issue 3 — `400 All fields are required` again, after re-enabling the header:**
Cause: a single trailing space in the form-data key (`'password '` instead of `'password'`).
Confirmed by temporarily logging the raw `req.body` object, which revealed the key exactly as
received. Since JavaScript treats `password` and `password ` as entirely different property
names, destructuring `password` from the body silently returned `undefined`. Lesson: when a
field "looks" correct in a UI but validation still fails, log the raw object rather than
re-checking the UI visually — invisible characters (trailing spaces, etc.) won't show up by eye.

**Outcome:** `POST /api/doctors/register` now correctly accepts profile fields + a document
upload, hashes the password, stores the file under `uploads/doctor-documents/`, and creates the
doctor record with `verificationStatus: "Pending"`.

---

## 8. AI document verification (PR #2, merged 6 Sept 2026)

**What:** an admin can run an AI check that reads a doctor's uploaded certificate and compares
name / registration number / degree with what the doctor typed in. Endpoint:
`POST /api/admin/doctors/:id/verify-document`; the result is stored in an embedded
`aiVerification` object on the doctor.

**Decisions**
- **Vision LLM, not Tesseract/OCR.** A vision-capable model reads messy real-world scans more
  robustly than classic OCR and reuses the `openai` SDK already installed. Trade-off: it costs
  money per call and can be wrong, so the output is presented as *advice*.
- **On-demand, not automatic.** Running it at registration would spend an API call on every
  attempt, including spam and registrations nobody ever reviews. The admin clicks a button instead.
- **Structured outputs (strict JSON schema)** so the response is always parseable, with a
  three-way verdict per field (`match` / `mismatch` / `uncertain`) rather than a boolean, because
  "the scan is blurry" is a real third state.
- **It never changes `verificationStatus`.** Approve/reject stays a human decision. There is also no
  public medical-registry API to check against, so this is a consistency check between the form
  and the document, not real credential verification.
- **Images only.** JPG/PNG go to the model. A PDF returns a clear "review manually" `Failed`
  result rather than a guessed API call. (Rendering page 1 of a PDF to an image is the obvious fix.)
- **Failures are data, not exceptions.** A bad key, network error or empty response is returned as
  `status: "Failed"` with an `errorMessage`, so one flaky call can't break the review screen.
- **Model name is configuration** (`OPENAI_VISION_MODEL`), not hard-coded, because model
  line-ups change faster than this code.

### 8.1 Debugging note: a schema change did not change the database (Sept 2026)
Registering a second doctor failed with `E11000 duplicate key ... loginId: null`, even though the
schema declared `loginId` as `unique` **and `sparse`**. Cause: the unique index had been created
before `sparse: true` was added to the schema, and **Mongoose creates missing indexes but never
alters an existing one**, so the database kept the old non-sparse index (two `null`s collide).
Fix: drop `loginId_1` and let Mongoose rebuild it as sparse. Lesson: an index change is a
*migration*, not just a schema edit. (Fresh databases are unaffected; the fix is in the
[troubleshooting table](06-Setup-and-Run-Guide.md#6-troubleshooting).)

---

## 9. Booking core (PR #3, merged 9 Sept 2026)

**What:** `DoctorAvailability`, `Slot` and `Appointment`, plus doctor activation, slot listing and
atomic booking. Implements phases 1 and 2 of the plan in section 7; phase 3 (lunch/break
blocking inside a day) is still deferred.

**Decisions**
- **Template, not pre-generated slots.** A doctor stores a weekly pattern; a `Slot` document is
  created only when a specific date+time is first touched. The database stays small and a doctor
  changing their template doesn't require rewriting a month of rows. Capacity is copied onto the
  slot when created so later template edits can't retroactively change an existing slot.
- **Two-step atomic booking.** `ensureSlot` (upsert, protected by the unique index
  `(doctor, date, time)`) then `claimSlot` (`findOneAndUpdate` with `bookedCount < max` and `$inc`).
  Splitting them keeps the contended step a *pure conditional increment* with no upsert in it. If
  two requests race to create the same slot, the loser gets `E11000` and simply re-reads it.
  Verified with two simultaneous requests for one seat: one `201`, one `409`.
- **Compensation.** If `Appointment.create` fails after a seat was claimed, `releaseSlot` gives it
  back (there is no multi-document transaction; this is the simpler equivalent).
- **Activation gate.** The PRD ties "activate" to first-time setup, and the `isActivated` flag
  already existed unused. A doctor must save availability before activating, and only
  Approved + Activated doctors are listed or bookable.
- **30-day window** (PRD: "only for a month"), and **payment is mocked**: the amount is validated
  against `MIN_BOOKING_AMOUNT`, no gateway. (This closes the "payment handling" open decision.)

---

## 10. What the automated PR review caught (PRs #2 and #3)

Every PR runs the Claude Code review action. On these two it found real defects, all confirmed by
reading the code and fixed on the same branch before merge. This is the most useful record of
"bugs that looked fine".

| # | Finding | Fix |
|---|---|---|
| PR #2 | **Plaintext passwords in server logs.** A leftover debug `console.log(req.body)` in the registration route wrote every doctor's password before it was hashed. | Removed the debug logging. |
| PR #2 | **Approval overwrote the doctor's own password** with a freshly generated one, so the password chosen at registration could never be used. A leftover from the old admin-creates-everything design. | Approve only generates a temporary password when the doctor has none. |
| PR #2 | **A newly required field broke a dead route.** Making `documentPath` required broke the old admin-creates-doctor endpoint, which the docs said had been retired but was still mounted. | Deleted the dead route and its duplicate helper functions. |
| PR #2 | **OpenAI client built at import time**, before `dotenv.config()` ran, so a key that lived only in `.env` would crash server start-up outside Docker (Docker masked it by injecting env vars first). | Lazy `getOpenAIClient()` created on first use. |
| PR #3 | **Negative `slotDurationMinutes` caused an infinite loop.** The route only truthiness-checked it, so `-15` passed; the slot generator then never terminated, and since it's reachable from the public slots endpoint and Node is single-threaded, one bad record could freeze the whole server. | Range checks in the route, `min: 1` in the schema plus `runValidators` on the upsert (validators don't run on `findOneAndUpdate` by default), and a guard in the loop itself. |
| PR #3 | **`NaN` bypassed the minimum-amount check** (`Number("abc") < 100` is `false`), and the seat had already been claimed before the failed insert, permanently burning capacity. | `Number.isFinite` validation before anything is claimed, plus `releaseSlot` compensation. |
| PR #3 | **Times that had already passed today were still bookable**, because the window check only compared calendar days. | Filtered in the shared candidate-times helper, so `/slots` and `/book` can never disagree. |

Takeaways: validate numeric input with `Number.isFinite`, not just comparisons; "the docs say it's
gone" is not the same as "it's gone"; and defence in depth (route validation *and* schema *and* the
loop guard) is cheap for anything reachable from an unauthenticated endpoint.

---

## 11. Patient frontend (PR #4, merged 15 Sept 2026)

First UI. Before this, every feature had only been exercised with Postman/curl.

**Two blockers surfaced by trying to build it** (both small backend changes, not scope creep):
1. **No public doctor listing existed.** The only list endpoint was admin-only, so a patient UI had no
   way to discover a `doctorId`. Added public `GET /api/doctors` (search + specialization) and
   `GET /api/doctors/:id`, limited to Approved + Activated doctors.
2. **CORS had never been wired up** even though the `cors` package was installed since the first
   day (section 4 lists it). Every browser call would have been blocked. Added `cors()` restricted to
   `FRONTEND_URL`.

**Decisions:** React Router; Tailwind CSS v4 through the `@tailwindcss/vite` plugin (no PostCSS
config); plain `fetch` behind one small typed wrapper and React Context for auth, with no
Redux/React-Query, since the app is small; scope limited to the patient flow so the PR stayed
reviewable (doctor and admin UIs followed separately).

**Gotcha: stale `node_modules` in Docker.** After adding dependencies, the frontend container
crash-looped with `Cannot find package '@tailwindcss/vite'`. Compose mounts an anonymous volume at
`/app/node_modules`, and `--build` alone does not replace an existing anonymous volume. Fix:
`docker compose up -d --build --force-recreate -V frontend` (`-V` renews anonymous volumes).

**Verification approach:** a headless-Chromium (Playwright) script drives the real UI against the
live backend and takes screenshots. Twice a "failure" turned out to be the *test script*: a text
selector matched the navbar as well as the page heading, so an assertion passed before navigation
actually happened. Lesson: assert on specific roles/URLs, and look at the screenshots.

---

## 12. AI symptom-guidance chat (PR #5, merged 16 Sept 2026)

- **One ongoing conversation per patient** (`ChatLog`, messages embedded), matching the data-model
  note in section 7. New threads per topic are a later extension.
- **Separate `OPENAI_CHAT_MODEL`** rather than reusing the vision-model setting, since this is plain
  text; a cheaper small model is appropriate for chat.
- **Safety is a design requirement, not boilerplate.** The system prompt limits the assistant to
  general triage-level guidance: never a diagnosis, never a specific medication or dose, explicit
  "seek emergency care now" for red-flag symptoms, always steer toward a real doctor. The UI
  repeats this in a permanent disclaimer, because the prompt alone isn't visible to the user.
- **Cost and abuse bounds:** only the last 20 messages go to the model (full history stays in Mongo)
  and messages are capped at 1000 characters.
- **A failed AI call persists nothing**, so history never contains a one-sided turn the patient
  never got an answer to. The UI shows an inline retry message.
- *Status:* verified end to end with a placeholder key (the failure path). The success path needs a
  real key; see [Setup & Run Guide](06-Setup-and-Run-Guide.md#4-ai-provider-key).

---

## 13. Admin dashboard (PR #6, merged 16 Sept 2026)

Makes the flagship AI feature demoable in a browser: verification queue, review page (profile,
certificate, AI result), approve/reject.

- **The certificate had no way to be viewed.** No static serving existed, and serving the uploads
  folder publicly would leak sensitive documents to anyone who guessed a filename. Added an
  admin-only `GET /api/admin/doctors/:id/document`. Because `<img src>` can't send an
  `Authorization` header, the page fetches the bytes as a blob and displays them with
  `URL.createObjectURL` (revoked on unmount). PDFs get a download link.
- **Separate `AdminAuthContext`** (its own localStorage key) instead of generalising the already
  verified patient context, to avoid touching working code that has no automated tests.
- The approve endpoint returns a temporary password only when generated; the UI shows the Login ID
  and any temporary password in a persistent callout, not a toast, since it can't be retrieved again.

---

## 14. Doctor dashboard (PR #7, merged 18 Sept 2026)

- **Two more missing endpoints**, both required: `GET /api/doctor/profile` (a doctor couldn't view
  their own profile before activation; the public and admin endpoints don't fit) and
  `GET /api/doctor/appointments` (the PRD asks for it; only the patient-side one existed).
- **The availability form replaces the whole template on save**, mirroring the backend's upsert
  semantics, instead of pretending to support per-day incremental edits it can't.
- **Activation button mirrors the backend gate** (disabled until availability exists).
- This is the **third** parallel auth context (patient, admin, doctor). Three copies of the same ~60
  lines is the point where extracting one generic implementation starts to pay off.
- "No availability yet" is a legitimate `404` from the API; the client treats it as an empty state,
  so it appears as a 404 in the browser network tab without being an error.

---

## 15. Configurable AI provider, and a real Gemini key verified live (4 Oct 2026)

The user didn't want to spend OpenAI's new $5 minimum just to try the two AI features. Added one
optional env var, `OPENAI_BASE_URL`, so the existing `openai` SDK client can point at any
OpenAI-compatible endpoint instead of only `api.openai.com` — Google Gemini's genuinely free tier
(no card) was the target. Neither AI service needed to change; both already read model names from
env and call the shared client.

**Then it was actually tested against a real Gemini key, live — both features, not just the
failure path this project had only ever verified before:**
- Symptom chat: a real, correctly non-diagnostic reply came back and persisted to history.
- Document verification (the uncertain one — vision + structured JSON output through a
  compatibility layer): tested with a generated demo certificate, once with matching submitted
  details and once with mismatched ones. Both the `match` and `mismatch` verdicts came back
  correctly per field, plus a genuinely useful concern the model noticed on its own (a "demo
  document" watermark). The previously-flagged risk — a forum report that image input might not
  work through Gemini's OpenAI-compatible endpoint — **did not reproduce here**; it worked
  cleanly on the first real attempt.

Three real problems hit along the way, each now in the troubleshooting table:
1. **The model name was already deprecated.** `gemini-2.5-flash-lite`, used when this feature was
   built days earlier, had been retired for new users in the interim. Google's own error message
   named the replacement (`gemini-3.5-flash-lite`), which worked immediately. Free-tier model
   line-ups move fast; expect to do this again.
2. **`docker compose restart` does not re-read `env_file`.** It restarts the existing container
   with whatever environment was captured when it was *created* — so editing `backend/.env` and
   restarting silently keeps using the old values. `docker compose exec backend env` showed the
   stale `OPENAI_API_KEY`/model vars confirming this; `docker compose up -d --force-recreate backend`
   is the actual fix. This project has used plain `restart` after `.env` edits dozens of times
   before this session without ever hitting it, because until now every such edit happened to run
   right after an `up --build` that recreated the container anyway for an unrelated reason
   (new dependency, etc.) — this is the first time an env-only edit was tested in isolation.
3. **The `openai` SDK couldn't parse Gemini's error response** for the deprecated-model case,
   surfacing only `BadRequestError: 400 status code (no body)`. Calling the compatibility
   endpoint directly with `curl` (bypassing the SDK) revealed Google's actual, informative error
   message. Lesson repeated from earlier in this log (the multipart-upload debugging saga):
   when a library's error handling goes quiet, go around it and look at the raw response.

Also fixed in passing: `backend/.env` had carried a duplicate `JWT_SECRET` line since the very
start of the project (section 2) — never actually breaking anything since dotenv deterministically
used whichever line came last, but exactly the footgun the Setup Guide already warned about. Removed.

---

## 16. Doctor registration UI, and two review findings (PR #10, merged 5 Oct 2026)

**What:** a doctor registration form in the UI (`/doctor/register`) — self-registration had been API-only since section 7.1.

The automated PR review caught two real issues on this PR, both fixed before merge:
- **Path traversal via the uploaded document's filename.** The multer `destination`/`filename` config used the client-supplied `file.originalname` directly in the stored path (e.g. a crafted `../../../etc/x.pdf` would write outside the uploads folder). Fixed by deriving the extension from the already-validated mimetype and generating the actual filename with `crypto.randomBytes`, so `originalname` never touches the constructed path at all.
- **An unhandled upload error leaked a raw stack trace.** A rejected file (wrong type, over the size limit) threw inside Multer before any route handler ran, which Express's default error handling returned as an HTML stack trace to the client. Fixed with an Express error-handling middleware that recognizes `multer.MulterError` and returns a clean `{ error }` JSON message instead.

---

## 17. Security sweep (PR #11, merged 5 Oct 2026)

Six findings from a full-codebase review, deliberately split into two PRs: five genuine bugs here, and the sixth (three duplicated auth contexts — a pure refactor, no bug) as its own PR (section 18) so this one stayed focused and easy to review.

- **JWT secret silently defaulted to `''` if unset — critical.** `jwt.verify`/`jwt.sign` used `process.env.JWT_SECRET || ''` everywhere. A missing env var meant every token was signed and verified against the literal empty string — anyone could forge a valid token for any role. **Fix:** fail fast, not silently. A new `getJwtSecret()` throws if unset; `index.ts` calls it once right after `dotenv.config()` and `process.exit(1)`s if it throws, the same philosophy already used for the MongoDB connection check. No `|| ''` fallback exists anywhere afterward — the server cannot start without a real secret.
- **Admin approve/reject — non-atomic find-then-save race.** Two concurrent approve requests for the same pending doctor could both pass the status check before either saved. **Fix:** the same atomic-conditional-update pattern the booking code already used — `findOneAndUpdate({ _id, verificationStatus: 'Pending' }, update, { new: true })`. A race now gets a clean `409` instead of a corrupted result.
- **ChatLog find-or-create race.** Two near-simultaneous first messages from one patient could both find no existing `ChatLog`, both call the AI (real cost incurred), then race on `.save()` — the loser hit the unique index on `patient` and 500'd, silently dropping that reply. **Fix:** materialize the document first (`ensureChatLog`, the same `findOneAndUpdate` + `$setOnInsert` + upsert + catch-E11000-and-refetch pattern `ensureSlot` already used for bookings), before calling the AI. The final write becomes an atomic `$push`, not a read-mutate-save race.
- **DoctorAvailability first-save race.** The existing upsert didn't handle the classic concurrent-upsert duplicate-key race on a doctor's very first save. **Fix:** catch-and-retry, but the retry is a plain update (not a re-fetch like ChatLog) — this request's submitted schedule values matter, so silently discarding them in favor of whichever insert won first would be wrong.
- **Doctor search/specialization — regex injection.** Both query params went straight into `$regex` unescaped; an invalid fragment (e.g. `search=(`) threw at query-execution time, an unhandled 500 from a public endpoint. **Fix:** a small `escapeRegex()` helper applied to both before they're interpolated.

All five verified live against the real Docker stack, not just type-checked: the JWT fail-fast behavior, each race fired as two genuinely concurrent requests (one `200`/one `409` or equivalent), and the regex edge cases.

---

## 18. Auth-context consolidation (PR #12, merged 5 Oct 2026)

The sixth finding from the same review, split out on purpose (see section 17's intro). `AuthContext`, `AdminAuthContext` and `DoctorAuthContext` were three ~60-line copies of the same create-context/localStorage-sync/login/logout implementation — exactly the duplication flagged as a code smell back in section 14, revisited now that fixing it was actually in scope.

**Fix:** extracted one `createAuthContext<TUser>(storageKey)` factory; each of the three files shrank to a thin adapter that calls it and renames the generic `user` field to its domain-specific name (`patient`/`admin`/`doctor`), passing through its original exact error message so `useAuth()`/`useAdminAuth()`/`useDoctorAuth()` throw byte-identical errors to before if called outside their provider. Net effect: ~140 fewer lines, zero change to any hook name, returned field, or component name — none of the 17 existing consumption sites needed editing. Verified with Playwright: all three roles' sessions still persist across a refresh, stay isolated from each other in the same browser, and logout still only clears that one role's key.

---

## 19. Forgot password via email (PR #13, merged 5 Oct 2026)

**What:** patient-only forgot/reset-password flow, email delivery via Brevo's transactional API (free tier, no card).

**Why Brevo:** same free-tier-first approach as the Gemini decision in section 15. The user initially hit friction signing up (Brevo's form asks for a company name) — resolved by just entering any text there; it isn't validated against a real company.

**Design, mirroring patterns already established in this codebase:**
- **Token handling mirrors bcrypt.** A random token (`crypto.randomBytes(32)`) is emailed, but only its sha256 hash plus a 1-hour expiry are persisted — never the raw token, the same never-store-the-secret philosophy as the password hash itself. Single-use: cleared on a successful reset.
- **No user enumeration.** `forgot-password` always returns the same generic message whether or not the email matches an account. If it matches, the email send failure *is* a real error (returned as a `500`, cause logged server-side only) — unlike the booking receipt added later (section 23), this email **is** the entire point of the request, so its failure can't be silently swallowed.
- **Scoped to patient only**, a deliberate decision: doctors/admins are admin-provisioned and a much smaller population, not worth the added surface right now.

Verified live with a real Brevo account end-to-end: request → email received → link followed → new password set → login succeeds with the new password, fails with the old one. Also verified the no-enumeration behavior and wrong/reused/expired token rejection.

**Incident during verification:** a scratch `mongosh` command written to inspect a dummy field accidentally included an unintended `updateOne` that overwrote the real admin account's password hash. Caught immediately, fixed by resetting it to a known value and telling the user. Lesson: a one-off diagnostic DB command deserves the same "what does this actually do" scrutiny as a code change, especially when it's a write, not a read.

---

## 20. UI polish (PR #14, merged 5 Oct 2026)

**What:** the entire app was pure black/white/slate — Tailwind v4 with zero customization (`index.css` was the bare `@import`). Added one consistent teal accent (buttons, links, focus rings, active nav state via `NavLink`), a shared footer, initials avatars on doctor cards, and styled empty/error states (a bordered alert box instead of bare red text) — applied as a mechanical, repeated class-level change across every page, described once and applied everywhere rather than bespoke per page.

**Decision:** no new theme-token abstraction (no Tailwind `@theme` block) — literal `teal-600`/`teal-700` classes directly, since this is a one-shot consistent recolor, not an evolving design system, and nothing in the codebase already has a token layer to extend. The admin area kept its existing dark header as a deliberate visual distinction, just with a teal logout button tying it back to the rest of the brand.

Verified via Playwright screenshots at desktop and mobile widths across public pages, an authenticated patient session, and the admin dashboard, plus a functional smoke test (login, doctor search) confirming the class-only changes didn't touch behavior. `eslint`'s 5 pre-existing errors (unrelated to this change — an auth-context fast-refresh pattern and two pre-existing `setState`-in-effect warnings) were confirmed unchanged from `main` before merging.

---

## 21. Cancel appointment, 48-hour rule (PR #15, merged 5 Oct 2026)

**What:** `PATCH /api/appointments/:id/cancel` (patient-only) — the first of the PRD's three explicitly-requested features still missing (cancel/reschedule, doctor photo+bio, booking receipt — reschedule itself stays out of scope here, deliberately, as a separate future PRD item).

The schema was already ready for this: `Appointment.status` has included `'Cancelled'` in its enum since section 7, unused until now. The compensating action this needs also already existed: `releaseSlot(slotId)`, previously only used to undo a claim when `Appointment.create` failed after a successful `claimSlot` — cancellation is the same "give the seat back" operation.

**Design:** load the appointment, 404 if missing or not owned by the caller; 409 if not currently `Booked`; a 48-hour check combining the stored date with its `HH:mm` time (same UTC approach the booking routes already use), which also naturally rejects an appointment already in the past with no separate check; then the same atomic-conditional-update pattern as admin approve/reject (section 17) so a concurrent double-cancel can't both succeed; then `releaseSlot`.

Verified live: full round trip (status flips, slot frees up and becomes bookable again), the 48-hour rejection (via a direct DB-write-adjusted appointment), a concurrent double-cancel (one `200`/one `409`, no double-release), cancelling another patient's appointment (`404`), and the UI end-to-end. **Caught a real bug during that UI verification:** the cancel response's appointment isn't populated with doctor info the way `GET /my`'s is, so replacing the whole object in local state briefly showed "Dr. Unknown" on the just-cancelled row — fixed by merging in just the `status` field instead of the whole response object.

---

## 22. Doctor photo + bio (PR #16, merged 5 Oct 2026)

**What:** the second of the three requested features. Doctor cards and profiles showed only credentials — nothing to help a patient choose between doctors.

**Scoped as self-service, post-approval:** the doctor sets their own photo + bio from their dashboard once already approved and active, the same way they already manage availability — not bolted onto the public, unauthenticated registration form (which already handles one security-sensitive upload, the subject of section 16's path-traversal fix; keeping that to a single file upload keeps that surface small).

A second Multer config (`uploadPhoto`) mirrors the existing document-upload one exactly (same crypto-random filename generation) but images only, its own directory, a 2MB limit. Public endpoints compute a `photoUrl` from the stored filename rather than ever exposing the raw filename. Photos are served via plain `express.static`, deliberately different from documents, which stay admin-gated and streamed through an authenticated route — photos are meant to be public, documents are not.

Verified live end to end (register → approve → activate → set photo + bio → confirmed on self profile, public list, and public detail), including photo replacement deleting the old file and invalid file type/oversize uploads rejected cleanly. **Caught a real bug during verification:** the shared Multer error handler in `index.ts` hardcoded "File must be 5MB or smaller" for every upload — correct for documents, wrong once the 2MB photo limit existed. Fixed to look up the right limit by field name (`document` vs `photo`) rather than a single hardcoded number.

---

## 23. Booking confirmation email receipt (PR #17, merged 5 Oct 2026)

**What:** the third requested feature. A patient who booked got nothing but the in-app response — no record in their inbox.

Reused the email infrastructure from section 19 rather than duplicating it: extracted a shared `sendEmail()` helper out of what had been `sendPasswordResetEmail`'s inline Brevo call, so the new `sendBookingReceiptEmail` template didn't need to repeat the fetch/header/error-handling boilerplate.

**Deliberately non-blocking, unlike the reset email in section 19:** by the time this send would fire, the booking has already fully succeeded (slot claimed, `Appointment` created) — the email is a courtesy copy, not a precondition, so it runs in its own try/catch that only logs on failure. Scope stayed to booking only; cancellation (section 21) doesn't get an email in this change, matching exactly what was asked for rather than building a general notification system.

Verified live: the password-reset flow still worked unchanged after the shared-helper refactor, a real receipt email arrived with correct doctor/date/time/amount for an actual booking, and — breaking the Brevo API key on purpose — booking still succeeded with the correct `201` when the send failed, the real cause logged server-side only.

---

## 24. Session-expiry auto-recovery (PR #18, merged 5 Oct 2026)

**What a user actually hit:** after a long session, an admin page showed "Invalid or expired token" with no way back except guessing the login URL or manually clearing `localStorage`. Root cause: `ProtectedRoute`/`AdminProtectedRoute`/`DoctorProtectedRoute` only check that a token is *present*, never that it's still valid, so a stale token let the user through to a page whose API calls then failed with a 401 that just rendered as a raw inline error.

**Fix:** a shared `handleUnauthorized(path)` in `api/client.ts`. On any 401, it maps the request path to the role it belongs to — via the same route prefixes the backend already uses to gate each role's routes (`/api/admin`, `/api/doctor/`, `/api/appointments`, `/api/chat`), so no new role-tagging scheme was needed — clears that role's stored session, and sends the browser to that role's login page. `apiRequest` calls it on every 401 automatically; the two authenticated calls that bypass `apiRequest` for non-JSON bodies (the admin document blob fetch, the doctor profile photo upload) call it the same way.

Verified live by injecting a stale/invalid token into `localStorage` for each of the three roles and visiting a protected page: each now redirects to that role's login and clears the stale entry. Confirmed no false positives — a normal valid login still works and keeps its session, and a wrong-password attempt still just shows its usual inline error.

---

## 25. How things were verified, and the limits of that

- API behaviour: `curl` against the running stack, including negative cases (bad role, bad input,
  the concurrent-booking race).
- UI behaviour: Playwright scripts against the live frontend and backend, with screenshots reviewed by
  eye, plus a cross-role run (doctor sets availability → patient books → doctor sees the booking).
- Every run cleaned up its own test data.
- **There is no automated test suite.** Two placeholder smoke tests exist (they only check that files
  are present); `backend/npm test` is the default "no test specified" stub, and `frontend/npm test`
  currently fails because a CommonJS `require` sits inside an ES-module package. Real integration
  tests are the top roadmap item, so verification stays repeatable.
- The AI success paths were failure-path-only verified for most of this project's history; section 15
  closes that gap against a real (free) key.

---

## 26. Open decisions / things to revisit later

Resolved since the last update:
- [x] **Payment handling** for the minimum booking amount: *decided, mocked.* The amount is validated only; no gateway in v1 (section 9).
- [x] **LLM provider for the deployed demo:** *decided, OpenAI-compatible API, with Google Gemini's free tier as the default recommendation* (section 15) rather than requiring OpenAI's now-paid-only access. A local model isn't publicly reachable.
- [x] **Real AI key configured and both success paths verified live** (section 15) — previously only the failure path had ever been tested.
- [x] **Doctor self-registration form in the UI** (section 16).
- [x] **Extract a shared generic auth context now that three exist** (section 18).
- [x] **Cancel appointment with the 48-hour rule** (section 21). Reschedule is still open — see below.
- [x] **Email infrastructure** (Brevo) stood up for forgot-password (section 19) and reused for the booking receipt (section 23).
- [x] **Session recovery on an expired token** (section 24).

Still open:
- [ ] **Deployment target and MongoDB hosting** (a hosted Atlas free cluster is the likely answer for the database; the app hosts are being compared).
- [ ] **Where uploaded certificates and photos live.** Local disk is lost on hosts with an ephemeral filesystem; needs object storage or a persistent volume.
- [ ] **Rate limiting**, especially on `POST /api/chat/message`, `verify-document`, and now the email-sending endpoints (`forgot-password`, booking), before any public deployment — more pressing now that real, quota-limited keys (AI and Brevo) are in play.
- [ ] Compile TypeScript to plain JS for a production build stage (the containers still run `ts-node-dev` / the Vite dev server).
- [ ] Revisit upgrading the backend to TypeScript 7 once `ts-node`/`ts-node-dev` support it (the backend is pinned to 5.9; the frontend already builds on 6.x).
- [ ] Automated tests (backend integration, plus a small end-to-end suite).
- [ ] Reschedule appointments; patient OTP login (forgot/reset password by email now substitutes for part of this need — section 19); admin user directory, emergency appointment management and reports; doctor notifications and holiday unblocking.
- [ ] An "all doctors" admin page — today only *pending* doctors are listable in the UI; an approved doctor's Login ID must be looked up directly in MongoDB if forgotten.
- [ ] Remove or adopt the unused `shared/types.ts` and `database/seed.js` stubs.
- [ ] A data-fix for one pre-existing doctor record with no `verificationStatus` set (predates this project phase; currently invisible to the public listing as a result) — flagged, not yet actioned.

---

## 27. How to keep this doc useful

Add a new dated entry (or update the relevant section above) whenever:
- A new dependency is added and there's a *reason* it was chosen over an alternative.
- A bug/error is hit that isn't obvious from the error message alone (like the TypeScript 7 / ts-node issue).
- A design decision is made that trades one thing off against another (like embed vs. reference, or atomic increment vs. simplicity).

Skip logging routine, self-explanatory work (e.g. "added a button") — this doc is for
*decisions and reasoning*, not a full commit history (that's what Git commit messages and
`CHANGELOG.md` are for).
