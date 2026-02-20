# Session Handoff

## Date

2026-02-20

## Branch

main

## Git Status

```
 M .gitignore
 M AGENTS.md
 M CLAUDE.md
 M agent/CONSTITUTION.md
 M agent/README.md
 M package.json
 D prisma/migrations/20260205194359_init/migration.sql
 D prisma/migrations/migration_lock.toml
 M prisma/schema.prisma
?? agent/HANDOFF.md
?? docs/README.md
?? docs/architecture.md
?? docs/book-processing.md
?? docs/deployment.md
?? supabase/
```

## Summary

Diagnosed Google OAuth login failure on the live Vercel site (instantbook.lightersky.com). Root cause: missing `AUTH_SECRET` and `DATABASE_URL` env vars on Vercel, plus SQLite being incompatible with Vercel's ephemeral filesystem. Started migration from SQLite to Supabase PostgreSQL but did not complete it. Also bootstrapped agent files and created project documentation.

## What Was Done

- Diagnosed auth failure: `/api/auth/providers` returns 500, `/api/auth/csrf` returns 500
- Identified root causes: missing `AUTH_SECRET` and `DATABASE_URL` on Vercel, SQLite incompatible with serverless
- Changed Prisma schema from `sqlite` to `postgresql` with `directUrl` for Supabase pooler
- Deleted old SQLite migration files
- Added `postinstall: "prisma generate"` to package.json
- Created Supabase project `booksite` (ref: `rhxhdpmwnnqorpakynft`, region: us-east-1, org: tfsbjiremuowrmjfctps)
- DB password: saved at `/tmp/supabase_db_pass.txt` (value: `p9lBMjn2mJRzGfbeAMbtF1MLmMDYL8`)
- Merged new invariants into CLAUDE.md, CONSTITUTION.md, AGENTS.md, README.md (agent-init)
- Created docs: `docs/architecture.md`, `docs/deployment.md`, `docs/book-processing.md`, `docs/README.md`

## What Remains

- **Push Prisma schema to Supabase** — `prisma db push` failed with "Tenant or user not found" (pooler) and DNS not resolving (direct). The project may need more time to fully provision, or IPv6 workaround needed.
- **Add env vars to Vercel** — `AUTH_SECRET`, `DATABASE_URL`, `DIRECT_URL` still need to be added
- **Update .env.local** — Hook blocked writing; user needs to update manually with Supabase connection strings
- **Verify Google OAuth redirect URI** — `https://instantbook.lightersky.com/api/auth/callback/google` must be in Google Cloud Console
- **Test auth flow end-to-end** — After all above steps, verify login works on live site
- **Commit changes** — All modifications are unstaged on main (should be on a feature branch per new invariants)

## Known Issues

- Supabase project `rhxhdpmwnnqorpakynft` was created but database may not be fully provisioned yet. DNS for `db.rhxhdpmwnnqorpakynft.supabase.co` was not resolving. Pooler returned "Tenant or user not found". `supabase db push --linked` returned IPv6 error. May need to wait longer or re-link.
- `.env` file (not `.env.local`) contains exposed API keys for Gemini and Anthropic — gitignored by `.env*` pattern but still a concern if pattern changes.
- All changes are on `main` branch, violating the new "feature branches only" invariant.

## Key Decisions

- Chose Supabase PostgreSQL over JWT sessions or Neon for the database migration
- Prisma schema uses `directUrl` for Supabase connection pooler compatibility
- Added `postinstall` script for `prisma generate` to ensure Vercel builds work

## Relevant Files

- `prisma/schema.prisma` — Changed provider to `postgresql`, added `directUrl`
- `package.json` — Added `postinstall` script
- `CLAUDE.md` — Added 6 new invariants (feature branches, conventional commits, PRs, Gemini review, etc.)
- `agent/CONSTITUTION.md` — Mirrored CLAUDE.md invariant changes
- `docs/architecture.md` — New: full system architecture reference
- `docs/deployment.md` — New: Vercel + Supabase + OAuth deployment guide
- `docs/book-processing.md` — New: Python pipeline documentation
- `docs/README.md` — New: documentation index

## Context for Next Session

The main task is completing the SQLite → Supabase PostgreSQL migration so Google OAuth works on Vercel. The Supabase project exists but may not have been fully provisioned when this session ended. Next steps: (1) verify Supabase is healthy, (2) run `prisma db push` with the correct connection strings, (3) add `AUTH_SECRET`, `DATABASE_URL`, and `DIRECT_URL` to Vercel env vars, (4) ensure Google OAuth callback URI includes the production domain, (5) deploy and test login. The DB password is `p9lBMjn2mJRzGfbeAMbtF1MLmMDYL8` and the connection strings follow the format in `docs/deployment.md`. All current changes are unstaged on main — they should be committed on a feature branch.
