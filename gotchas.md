# Gotchas

- 2026-11-10: Single-user app (owner confirmed). No concurrent writers, so no transactions or per-day data model; Firestore rules should allow one owner uid only.
- 2026-11-10: Most `tasks` docs carry legacy fields from the pre-rewrite app (images, mission, approverName, objective, ...). The UI no longer shows them, but writes must preserve them — never overwrite a task doc with only the form fields.
- 2026-11-10: Production Firestore rules (firestore.rules, deployed with `npx firebase deploy --only firestore:rules --project mpp-planner`) admit only the owner uid. `npm run backup` reads without signing in, so it now fails with permission-denied; it needs an authenticated path before it is useful again. Last good dump: backups/2026-11-10T05-30-02-150Z.json.
- 2026-11-10: The Firestore emulator needs Java. scripts/test-rules uses JAVA_HOME, else the first JDK under ~/.local/jdk/ (Temurin 21 zip, no system install).
- 2026-11-10: `npx http-server` caches files for an hour by default, so a browser keeps running old `app.js` after edits. Serve with `-c-1`; if a page already cached old code, fetch the files with `cache: 'reload'` or hard-reload.
- 2026-11-10: An undefined CSS custom property does not error. The browser drops the whole declaration (padding, gap, radius) and the page just looks cramped. `tests/unit/css-tokens.test.js` fails on any `var(--x)` in `css/style.css` that has no `--x:` definition. The e2e tests check behavior, not layout, so for visual changes take a screenshot (desktop and mobile) before pushing.
