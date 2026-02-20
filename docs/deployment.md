# Deployment

BookSite is deployed on Vercel with Supabase PostgreSQL and Google OAuth.

## Live Site

- **URL:** instantbook.lightersky.com
- **Platform:** Vercel
- **Database:** Supabase PostgreSQL (us-east-1)
- **Supabase project ref:** `rhxhdpmwnnqorpakynft`

## Environment Variables

### Required on Vercel

| Variable             | Purpose                                                          |
| -------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`       | Supabase pooled connection string (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL`         | Supabase direct connection string (port 5432)                    |
| `AUTH_SECRET`        | NextAuth.js session encryption key                               |
| `AUTH_GOOGLE_ID`     | Google OAuth client ID                                           |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret                                       |
| `GEMINI_API_KEY`     | Google Gemini API key (for book processing)                      |
| `ANTHROPIC_API_KEY`  | Anthropic API key (for AI features)                              |

### Local Development

Copy values to `.env.local` (gitignored). Same variables as production, though `DATABASE_URL` can point to the same Supabase instance or a local PostgreSQL.

## Database Setup

### Supabase

The database is hosted on Supabase (PostgreSQL). Prisma uses two connection strings:

- **`DATABASE_URL`** (pooled, port 6543): Used by the application at runtime via Supavisor connection pooling
- **`DIRECT_URL`** (direct, port 5432): Used by Prisma CLI for migrations and schema pushes

Connection string format:

```
# Pooled (runtime)
postgresql://postgres.{ref}:{password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct (migrations)
postgresql://postgres.{ref}:{password}@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

### Schema Management

```bash
# Push schema changes to database
npx prisma db push

# Generate Prisma client after schema changes
npx prisma generate

# View database in browser
npx prisma studio
```

The `postinstall` script in `package.json` runs `prisma generate` automatically during `npm install` (including Vercel builds).

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the Google+ API
4. Go to Credentials > Create OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://instantbook.lightersky.com/api/auth/callback/google` (production)
6. Copy Client ID and Client Secret to env vars

## Vercel Configuration

- **Build command:** `next build --webpack`
- **Framework:** Next.js (auto-detected)
- **Node.js version:** 20+
- **Build region:** Washington, D.C. (iad1)

### Important Notes

- The `outputFileTracingExcludes` in `next.config.ts` excludes `venv/` from the build
- Book processing (Python scripts) does **not** run on Vercel - only locally or on a server with Python installed
- Book content files in `data/books/` are read-only on Vercel (filesystem is ephemeral)
- Uploaded EPUBs and processed book data must be pre-existing in the repo or stored externally

## Deployment Checklist

1. All env vars set on Vercel (check with `vercel env ls`)
2. Database schema pushed (`npx prisma db push`)
3. Google OAuth redirect URI includes production domain
4. `AUTH_SECRET` is set (generate with `openssl rand -base64 32`)
5. Build passes locally (`npm run build`)
6. Push to `main` branch triggers auto-deploy
