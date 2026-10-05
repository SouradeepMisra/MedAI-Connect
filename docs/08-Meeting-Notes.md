Document Name : Meeting Notes / Project Milestones
Version       : 2.1
Author        : Souradeep Misra
Reviewer      : ChatGPT (Technical Architect)
Status        : Living document
Created Date  : 30 June 2026
Last Updated  : 5 October 2026

# Meeting Notes / Project Milestones

This started as an empty meeting-notes template. MedAI Connect is a solo project with no meetings to minute, so rather than leave placeholder text (or invent attendees), this file is a **dated log of what was delivered and decided**, taken from the actual git and pull-request history. The filename is kept so existing links keep working.

For the reasoning behind each decision see the [Development Log](03-Development-Log.md); for the current scope see the [PRD implementation status](02-Product-Requirement-Document.md#implementation-status).

## Original agenda (30 June 2026)

- Define project scope
- Review functional requirements
- Discuss architecture and milestones

**Decisions taken at kickoff:** create the initial project structure, prepare the documentation templates, plan the first development sprint. (Outputs: [Project Vision](01-Project-Vision.md) and [PRD](02-Product-Requirement-Document.md).)

## Timeline

| Date | Milestone | Reference |
|---|---|---|
| 30 Jun 2026 | Project Vision document created | first commit |
| 18 Jul 2026 | Development Log started. Stack decided: React + Node/Express + MongoDB + Docker (Angular dropped); Docker Compose environment set up | Dev Log §1, §5 |
| 19-21 Jul 2026 | Patient, doctor and admin models and endpoints; seed script; JWT verification and role middleware | commits 19-21 Jul, Dev Log §4, §7 |
| by 22 Jul 2026 | **Design pivot:** doctors self-register and upload a certificate; admin approves. Docker file-watching fix and the multipart-upload debugging | Dev Log §5.1, §7.1, §7.2 |
| 6 Sep 2026 | Claude Code review workflow added | PR #1 |
| 6 Sep 2026 | **Doctor self-registration + AI document verification**, doctor/patient login, admin approve/reject. Four review findings fixed | PR #2, Dev Log §8, §10 |
| 9 Sep 2026 | **Booking core:** availability template, lazy slots, atomic booking, activation. Three review findings fixed | PR #3, Dev Log §9, §10 |
| 15 Sep 2026 | **Patient frontend** (React, Tailwind, router); public doctor listing and CORS added | PR #4, Dev Log §11 |
| 16 Sep 2026 | **AI symptom-guidance chat** | PR #5, Dev Log §12 |
| 16 Sep 2026 | **Admin dashboard** (verification queue, certificate viewer, AI check, approve/reject) | PR #6, Dev Log §13 |
| 18 Sep 2026 | **Doctor dashboard** (profile, availability, holidays, activation, appointments). All three roles now have a UI | PR #7, Dev Log §14 |
| 4 Oct 2026 | Documentation pass: README, architecture, API reference, setup guide, end-to-end walkthrough, PRD status | PR #8 |
| 4 Oct 2026 | AI provider made configurable (any OpenAI-compatible endpoint); free Google Gemini documented and verified live for both AI features, replacing the OpenAI-only path that required a paid key | PR #9, Dev Log §15 |
| 5 Oct 2026 | **Doctor registration UI** added (was API-only); path-traversal and upload-error-leak fixes | PR #10, Dev Log §16 |
| 5 Oct 2026 | **Security sweep:** JWT fail-open fixed (fail-fast at startup), three non-atomic races made atomic (admin approve/reject, first chat message, first availability save), search regex escaped | PR #11, Dev Log §17 |
| 5 Oct 2026 | **Auth-context consolidation:** three ~60-line duplicated contexts replaced by one factory, no behavior change | PR #12, Dev Log §18 |
| 5 Oct 2026 | **Forgot password** via Brevo transactional email, patient-only, single-use 1-hour token | PR #13, Dev Log §19 |
| 5 Oct 2026 | **UI polish:** teal brand accent, active nav state, shared footer, styled empty/error states | PR #14, Dev Log §20 |
| 5 Oct 2026 | **Cancel appointment** with the PRD's 48-hour rule | PR #15, Dev Log §21 |
| 5 Oct 2026 | **Doctor photo + bio**, self-service, shown on the public listing and profile | PR #16, Dev Log §22 |
| 5 Oct 2026 | **Booking confirmation email receipt** via Brevo, non-blocking | PR #17, Dev Log §23 |
| 5 Oct 2026 | **Session-expiry auto-recovery:** an expired token now clears itself and redirects to login instead of leaving the user stuck | PR #18, Dev Log §24 |

## Decisions log (one line each)

| Decision | Chosen | Why |
|---|---|---|
| Frontend framework | React (not Angular) | Demonstrates the React skill being built; broader market reach |
| Doctor onboarding | Self-registration + admin approval | Removes the admin bottleneck and makes the AI feature real document processing |
| Document check | Vision LLM, on demand, advisory only | More robust than OCR; avoids cost on unreviewed signups; a human decides |
| Slot storage | Template + lazily created slots | Small database, template edits don't rewrite history |
| Booking safety | Single atomic conditional increment | No check-then-write race |
| Payment | Mocked (minimum amount validated) | A real gateway is a separate project; out of v1 |
| Frontend state | `fetch` wrapper + Context, no state library | App is small; fewer moving parts |
| Auth in the UI | Separate context per role, later unified into one factory | Don't touch verified working code to generalise it prematurely; revisit once three copies actually existed (PR #12) |
| PR size | One role or one feature per PR | Keeps each review meaningful (and it paid off, see Dev Log §10) |
| Password reset email | Brevo transactional API, not SMTP | Free tier, no card, simple REST call; reused for the booking receipt too |
| Cancellation email | Deliberately not built with cancel appointment | Scope stays to what was asked; a courtesy receipt only exists for booking, not cancellation |
| Session recovery | Clear + redirect on any 401, keyed by request path prefix | One choke point (`api/client.ts`) instead of touching every page that calls a protected endpoint |

## Open items carried forward

Deployment · uploaded-document storage for a hosted environment · rate limiting on the AI endpoints (more pressing now that a real, quota-limited key is in use) · automated tests · reschedule appointments · patient OTP login · admin user directory / emergency appointment management / reports · doctor clinic notifications and holiday unblocking · an "all doctors" admin page (currently only pending doctors are listable in the UI; approved doctors' Login IDs must be looked up directly in MongoDB). Full list: [Development Log §26](03-Development-Log.md#26-open-decisions--things-to-revisit-later).
