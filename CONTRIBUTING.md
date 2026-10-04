# Contributing

Contributions and feedback are welcome. This describes the workflow the project actually uses.

## Getting set up

Follow the [Setup & Run Guide](docs/06-Setup-and-Run-Guide.md). In short: copy `backend/.env.example` to `backend/.env`, run `docker compose up --build`, and seed the admin.

## Workflow

1. **Branch from `main`** using `feature/<scope>` (or `docs/<scope>`, `fix/<scope>`), e.g. `feature/doctor-dashboard`.
2. **Keep a PR to one feature or one role.** Small, single-purpose PRs get real reviews.
3. **Commit with [Conventional Commits](https://www.conventionalcommits.org/):** `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`. A short summary line, then a body explaining *why*, not just what.
4. **Open a pull request into `main`.** Describe what changed and why, list what you verified, and be explicit about anything deliberately left out.
5. **Automated review runs on every PR** (the Claude Code GitHub Action) and comments inline. Treat its findings like a human reviewer's: verify each one against the code, fix real ones on the same branch, and reply. Comment `@claude` on a PR to ask it a question.
6. Merge, delete the branch, and pull `main` before starting the next one.

## Before you open a PR

```bash
cd backend  && npx tsc --noEmit        # backend type-check
cd frontend && npm run build           # frontend type-check + production build
```

Then actually **use the feature**: drive it through the API or the UI, including the failure cases (bad input, wrong role), not just the happy path. Type-checking proves the code compiles, not that the feature works. Clean up any test data you created (database rows and files in `backend/uploads/`).

There is no automated test suite yet (see the README's *Testing status*); adding one is very welcome.

## Ground rules

- **Never commit secrets.** `.env` files are gitignored; put new settings in the matching `.env.example` with a placeholder and a comment.
- **Update the docs** when behaviour changes: the [API Reference](docs/05-API-Reference.md) for endpoints, the [Development Log](docs/03-Development-Log.md) for decisions and lessons, the [CHANGELOG](CHANGELOG.md) for user-visible changes.
- **AI features assist; humans decide.** Don't add flows where a model output approves, rejects or diagnoses anything on its own.
- Validate input at the boundary (numbers with `Number.isFinite`, ranges, lengths), and prefer one atomic database operation over check-then-write.
