Document Name : Development Log
Version       : 1.0
Author        : Souradeep Misra
Status        : Living document (update as the project progresses)
Created Date  : 18 July 2026
Last Updated  : 22 July 2026

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

## 8. Open decisions / things to revisit later

- [ ] Compile TypeScript to plain JS for a production build stage (currently running via `ts-node-dev` directly for simplicity).
- [ ] Revisit upgrading to TypeScript 7 once `ts-node`/`ts-node-dev` support it.
- [ ] Decide on payment handling for the "minimum booking amount" rule (real gateway vs. mocked/test-mode).
- [ ] Decide where MongoDB will run for the live demo deployment (self-hosted container vs. MongoDB Atlas free tier).
- [ ] Decide which LLM provider to use for the AI chat in the deployed demo (local Ollama has no cost but isn't publicly reachable; a cloud API is needed for a live link).

---

## 9. How to keep this doc useful

Add a new dated entry (or update the relevant section above) whenever:
- A new dependency is added and there's a *reason* it was chosen over an alternative.
- A bug/error is hit that isn't obvious from the error message alone (like the TypeScript 7 / ts-node issue).
- A design decision is made that trades one thing off against another (like embed vs. reference, or atomic increment vs. simplicity).

Skip logging routine, self-explanatory work (e.g. "added a button") — this doc is for
*decisions and reasoning*, not a full commit history (that's what Git commit messages and
`CHANGELOG.md` are for).
