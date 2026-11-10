# Gotchas

- 2026-11-10: Single-user app (owner confirmed). No concurrent writers, so no transactions or per-day data model; Firestore rules should allow one owner uid only.
- 2026-11-10: Most `tasks` docs carry legacy fields from the pre-rewrite app (images, mission, approverName, objective, ...). The UI no longer shows them, but writes must preserve them — never overwrite a task doc with only the form fields.
- 2026-11-10: Production Firestore currently allows unauthenticated reads (`npm run backup` works with no login). Run `npm run backup` before any rules change; dumps land in gitignored `backups/`.
- 2026-11-10: The Firestore emulator needs Java, which this machine lacks. Rules and e2e tests are blocked until a JDK is installed.
