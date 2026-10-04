Document Name : Setup & Run Guide
Version       : 1.0
Author        : Souradeep Misra
Status        : Living document
Created Date  : 20 September 2026
Last Updated  : 20 September 2026

# Setup & Run Guide

How to get MedAI Connect running on your machine, configure it, and fix the problems people actually hit. For the big picture see the [README](../README.md); for what to click once it's running see the [End-to-End Walkthrough](07-End-to-End-Walkthrough.md).

---

## 1. Prerequisites

| Need | For | Notes |
|---|---|---|
| Git | cloning | any recent version |
| Docker Desktop (Compose v2) | the recommended path | on Windows it needs WSL2 and CPU virtualization enabled in BIOS |
| Node.js 24 LTS + npm | running **without** Docker only | Node 24 is what the containers use |
| An AI provider key | the two AI features only | optional, and free if you use Gemini instead of OpenAI; see [section 4](#4-ai-provider-key) |

## 2. Run with Docker (recommended)

```bash
git clone https://github.com/SouradeepMisra/MedAI-Connect.git
cd MedAI-Connect
```

**Create the backend env file.** `docker-compose.yml` loads `backend/.env`, and Compose refuses to start if the file is missing.

```bash
cp backend/.env.example backend/.env          # PowerShell: Copy-Item backend\.env.example backend\.env
```

Open `backend/.env` and set at least `JWT_SECRET` to a long random value (generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`). Leave `OPENAI_API_KEY` as the placeholder if you just want to look around; see [section 4](#4-ai-provider-key) to enable the AI features (OpenAI, or Gemini for free).

**Start everything:**

```bash
docker compose up --build
```

This starts three containers: `medai-mongodb` (MongoDB 7), `medai-backend` (Express API with hot reload) and `medai-frontend` (Vite dev server). Wait until you see `MongoDB connected successfully` and `Backend running on port 5000` in the logs.

**Create the admin account** (one-off, in a second terminal):

```bash
docker compose exec backend npx ts-node src/scripts/seedAdmin.ts
```

It prints `Admin created: admin@medai.com / ChangeThisPassword123`, or `Admin already exists - skipping.` if you've done it before.

> The seeded credentials are a **development default**. Change the password (or the seed script) before exposing the app to anyone.

**Check it works:**

| What | Where | Expect |
|---|---|---|
| API health | http://localhost:5000/api/health | `{"status":"ok","service":"medai-connect-backend"}` |
| Patient site | http://localhost:5173 | "Find a Doctor" page (empty until a doctor is approved *and* activated) |
| Admin portal | http://localhost:5173/admin/login | log in with the seeded admin |
| Doctor portal | http://localhost:5173/doctor/login | needs an approved doctor, see the walkthrough |

**Everyday commands:**

```bash
docker compose up -d                 # start in the background
docker compose logs -f backend       # follow backend logs
docker compose restart backend       # restart one service
docker compose down                  # stop and remove containers (data is kept)
docker compose down -v               # ALSO delete the MongoDB volume (wipes all data)
docker compose exec mongodb mongosh medai-connect      # open a Mongo shell
```

Source folders are bind-mounted into the containers, so edits to `backend/src` and `frontend/src` reload automatically. Uploaded doctor documents land in `backend/uploads/` on your own disk (gitignored), so they survive container restarts.

## 3. Environment variables

### `backend/.env`

| Variable | Required | Default in code | Purpose |
|---|---|---|---|
| `JWT_SECRET` | yes | none | Signs login tokens. Long and random. Keep only **one** `JWT_SECRET` line in the file. |
| `MONGODB_URI` | yes | none | Mongo connection string. Docker Compose overrides it to `mongodb://mongodb:27017/medai-connect`; use `mongodb://localhost:27017/medai-connect` when running the backend directly. |
| `OPENAI_API_KEY` | for AI features | none | See section 4. Despite the name, this works with any OpenAI-API-compatible provider, not only OpenAI. |
| `OPENAI_BASE_URL` | no | OpenAI's API | Points the client at a different OpenAI-compatible endpoint (e.g. Gemini's free tier). Unset = real OpenAI. |
| `OPENAI_VISION_MODEL` | no | `gpt-4o` | Model that reads doctor documents (must accept images). Must be a model your chosen provider actually offers. |
| `OPENAI_CHAT_MODEL` | no | `gpt-4o-mini` | Model behind the symptom chat. Same caveat. |
| `MIN_BOOKING_AMOUNT` | no | `100` | Minimum amount accepted when booking. |
| `FRONTEND_URL` | no | `http://localhost:5173` | The one origin allowed to call the API from a browser (CORS). Must match exactly, including port. |
| `PORT` | no | `5000` | API port (Compose sets it). |

### `frontend/.env` (optional)

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5000` | Backend URL. Vite bakes it in at **build** time, so a deployed frontend must set it before `npm run build`. |

## 4. AI provider key

The AI document verification and the symptom chat call an OpenAI-API-compatible model. Without a working key the rest of the app is unaffected; those two features return a clean error (the admin sees a red "Failed" message, the chat shows "Something went wrong... try again"). Pick one of the two options below.

### Option 1: OpenAI (costs money, min $5)

OpenAI no longer gives new accounts any free trial credit - you prepay before the first call.

1. Sign in at https://platform.openai.com. This is the *API platform*, separate from a ChatGPT subscription; a ChatGPT Plus plan does **not** include API credit.
2. **Billing:** add a payment method and buy prepaid credit (minimum $5). Prepaid/gift-style cards are not accepted, only standard credit or debit cards. Turn **auto-recharge off** if you want a hard spending ceiling, and set a monthly budget/usage limit.
3. **API keys:** create a new secret key (a project-scoped key named e.g. `medai-connect` is best). Copy it immediately; it is shown once.
4. Put it in `backend/.env`: `OPENAI_API_KEY=sk-...`. Leave `OPENAI_BASE_URL` unset.
5. Check which models your account can use and set the two model variables to real names:
   ```bash
   curl -s https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"
   ```
   `OPENAI_VISION_MODEL` must accept image input; `OPENAI_CHAT_MODEL` can be a small, cheap text model.

### Option 2: Google Gemini (free, no card)

Google's Gemini API has a real no-credit-card free tier (via [Google AI Studio](https://aistudio.google.com)) that supports both vision and text, and speaks the OpenAI API format through a compatibility endpoint - so the exact same code above just points somewhere else.

1. Sign in at https://aistudio.google.com/apikey and create a free API key. No billing required.
2. In `backend/.env`, set all four:
   ```
   OPENAI_API_KEY=your-gemini-api-key
   OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
   OPENAI_VISION_MODEL=gemini-2.5-flash-lite
   OPENAI_CHAT_MODEL=gemini-2.5-flash-lite
   ```
3. **Use a Flash-Lite model, not plain Flash.** As of this writing, Flash models get a very small free daily quota (around 20 requests/day) while Flash-Lite models get a much larger one (around 500/day). Free-tier model names and limits change; confirm the current ones at https://ai.google.dev/gemini-api/docs/rate-limits before relying on a specific model.
4. The compatibility endpoint must end exactly at `.../v1beta/openai/` (trailing slash included) - the SDK appends `/chat/completions` itself.

### Either way

`.env` is gitignored and was never committed. **Never paste a key into code, docs, screenshots, or a PR.** After editing `backend/.env`, restart the backend so it re-reads the file: `docker compose restart backend`. Then verify: log in as a patient, open **AI Symptom Chat** and send a message; as an admin, open a pending doctor and click **Run AI Verification**.

If you deploy publicly, anyone can register and use these endpoints, so cap your budget/quota and add rate limiting first (see the README roadmap).

## 5. Run without Docker

Useful if you'd rather use your own Node and MongoDB.

1. Have MongoDB reachable, either a local install or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.
2. **Backend** (terminal 1):
   ```bash
   cd backend
   cp .env.example .env         # then set MONGODB_URI to your Mongo (e.g. mongodb://localhost:27017/medai-connect) and JWT_SECRET
   npm install
   npm run dev                  # ts-node-dev with hot reload, port 5000
   npx ts-node src/scripts/seedAdmin.ts     # one-off, in another terminal
   ```
3. **Frontend** (terminal 2):
   ```bash
   cd frontend
   npm install
   npm run dev                  # Vite, http://localhost:5173
   ```

Type-check / production-build the code at any time:

```bash
cd backend  && npx tsc --noEmit
cd frontend && npm run build          # tsc -b + vite build
```

## 6. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `docker compose up` fails: `env file ... backend/.env not found` | You haven't created it. `cp backend/.env.example backend/.env`. |
| `node` / `npm` / `docker` "not recognized" right after installing (Windows) | The terminal was opened before the installer updated PATH. Close and reopen the terminal (or restart VS Code). |
| Docker Desktop: "Virtualization support not detected" | Enable Intel VT-x / AMD-V in BIOS/UEFI, run `wsl --install` and `wsl --update`, restart. |
| Frontend container restarts in a loop with `Cannot find package '@tailwindcss/vite'` (or any newly added dependency) | The container's `node_modules` volume is stale from before the dependency was added. Recreate it: `docker compose up -d --build --force-recreate -V frontend`. |
| Backend doesn't pick up a new file / new route returns 404 | File-change events don't cross the Windows→Docker mount reliably. Polling is already enabled (`CHOKIDAR_USEPOLLING=true` in Compose); if it still lags, `docker compose restart backend`. |
| Browser console shows a CORS error | `FRONTEND_URL` in `backend/.env` must equal the page's origin exactly (`http://localhost:5173`, no trailing slash). Restart the backend after changing it. |
| Registering a *second* doctor fails with `E11000 duplicate key ... loginId` | An old database has a non-sparse unique index on `loginId`. Drop it and let Mongoose rebuild it: `docker compose exec mongodb mongosh medai-connect --eval 'db.doctors.dropIndex("loginId_1")'`, then `docker compose restart backend`. A fresh database is not affected. |
| AI check says `401 Incorrect API key provided` / chat says "Something went wrong" | `OPENAI_API_KEY` is still the placeholder or is wrong. See section 4, then restart the backend. |
| AI check says `Unsupported file type` | Only JPG/PNG are read by the AI check. PDFs upload fine but must be reviewed manually. |
| Using Gemini: the symptom chat works but the AI document check fails or returns nonsense | Image input through Gemini's OpenAI-compatibility endpoint has been reported as unreliable for some users/models (unconfirmed in this project - not yet tested against a real Gemini key). Try a different/newer `OPENAI_VISION_MODEL`; if it still doesn't work, the feature still fails cleanly - fall back to OpenAI for this one feature, or review documents manually. |
| Doctor page: "Failed to load document" | The file is missing from `backend/uploads/doctor-documents/` (e.g. you cleared it). Re-register the doctor. |
| Port already in use (`5173`, `5000`, `27017`) | Another process holds it. Stop it, or change the left side of the port mapping in `docker-compose.yml`. |
| Warning: `the attribute 'version' is obsolete` | Harmless. Newer Compose ignores the field. |
| Logged in as a patient but an admin/doctor page redirects to its login | Each role keeps a separate session (`medai_patient_auth`, `medai_doctor_auth`, `medai_admin_auth` in localStorage). Log in on that role's own page. |

## 7. Resetting to a clean slate

```bash
docker compose down -v                       # containers + MongoDB data
rm -rf backend/uploads/doctor-documents/*    # uploaded certificates (PowerShell: Remove-Item backend\uploads\doctor-documents\* )
docker compose up --build
docker compose exec backend npx ts-node src/scripts/seedAdmin.ts
```
