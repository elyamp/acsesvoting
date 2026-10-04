# ACSES Online Voting Platform

Secure online elections for the **Association of Computer Science and Engineering Students (ACSES)**.

Built with Next.js 16 (App Router), Prisma + Neon PostgreSQL, JWT sessions (jose), bcrypt password hashing, and zod validation.

## Features

- **Students** sign in with their index number (`FCM.00.000.000.00`) + UMAT school email + password
- **Admin pre-registration** — only students on the voter register can activate an account
- **Email OTP activation** — first-time voters verify a 6-digit code sent to their school email before setting a password
- **Anonymous ballots** — votes are stored with no link to the voter; only a `hasVoted` flag is kept, so nobody can trace how anyone voted
- **One vote per student** — enforced atomically in a database transaction
- **Admin console** — manage elections, positions, candidates, voters (single + bulk import), open/close voting, live results, CSV export, audit log
- **Roles** — `ADMIN` (run elections, view results) and `SUPERADMIN` (additionally manages admins, can delete drafts and remove voters)
- **Security** — httpOnly signed session cookies, bcrypt hashing, rate limiting on login/OTP/voting, security headers, input validation everywhere, full audit trail (actions only, never vote choices)

## Getting started

```bash
npm install
```

Create a Neon project, copy its pooled connection string into `DATABASE_URL`, and its direct (unpooled) connection string into `DIRECT_URL`. Copy `.env.example` to `.env` and set:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled PostgreSQL URL used by the app (`-pooler` hostname) |
| `DIRECT_URL` | Neon direct PostgreSQL URL used by Prisma migrations |
| `AUTH_SECRET` | Long random string used to sign session tokens (**required in production**) |
| `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` | Credentials seeded for the first superadmin |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated list of allowed school email domains (defaults to `st.umat.edu.gh`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional; sends real OTP emails. Without SMTP, codes are printed to the server console in development. |

Apply the initial PostgreSQL migration and seed the superadmin:

```bash
npm run db:deploy
npm run db:seed
```

Optional demo data (sample election + 4 activated voters with password `Vote1234!`):

```bash
# Windows (Git Bash)
SEED_DEMO=true npm run db:seed
# PowerShell
$env:SEED_DEMO="true"; npm run db:seed
```

Start the app:

```bash
npm run dev        # development
npm run build && npm start   # production
```

## Deploying to Cloudflare Workers

The app uses the OpenNext Cloudflare adapter. Candidate photos are stored in R2; the Next.js incremental cache uses a separate R2 bucket. Edit the bucket names and Worker name in `wrangler.jsonc` if you want different names.

1. Create a Neon project. Put its **pooled** PostgreSQL URL (`-pooler` hostname) in `DATABASE_URL` and its **direct** URL in `DIRECT_URL` in `.env`. Apply the schema and seed the first superadmin from your computer:

   ```bash
   npm run db:deploy
   npm run db:seed
   ```

   Run the seed command with a unique production `SUPERADMIN_EMAIL` and strong `SUPERADMIN_PASSWORD`; do not seed demo voters in production. `DIRECT_URL` is only needed for local Prisma migrations and seeding, not by the deployed Worker.

2. Install Wrangler tooling (already included in the project), sign in, and create the two buckets named in `wrangler.jsonc`:

   ```bash
   npx wrangler login
   npx wrangler r2 bucket create acses-voting-photos
   npx wrangler r2 bucket create acses-voting-cache
   ```

3. Generate the Cloudflare binding types and set production secrets:

   ```bash
   npm run cf-typegen
   npx wrangler secret put DATABASE_URL
   npx wrangler secret put AUTH_SECRET
   ```

   Use the Neon pooled URL for `DATABASE_URL`. Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` as Worker secrets if your mail provider supports the Worker's networking; set `SMTP_FROM`, `ALLOWED_EMAIL_DOMAINS`, and `NEXT_PUBLIC_APP_URL` as Worker variables. `NEXT_PUBLIC_APP_URL` must be the final HTTPS `workers.dev` or custom-domain URL. You can set secrets and variables in **Workers & Pages → your Worker → Settings → Variables and Secrets** instead of using Wrangler.

4. Deploy:

   ```bash
   npm run deploy
   ```

   Wrangler will build and deploy `acses-voting-app`. For a production-like local preview, create a `.dev.vars` file with `NEXTJS_ENV=development` and the environment values the app needs, then run `npm run preview`. Do not commit `.dev.vars`.

5. Optionally attach a custom domain in the Worker’s **Settings → Domains & Routes**. Update `NEXT_PUBLIC_APP_URL` to match it and redeploy.

On Windows, OpenNext may fail during its final bundling step if the process cannot create symlinks (`EPERM`). Use WSL/Linux, or enable Windows Developer Mode/run the terminal with symlink privileges; the regular Next.js build itself works on Windows.

This deployment does not copy `prisma/dev.db` or existing candidate images. If migrating existing records, migrate their image objects to the `acses-voting-photos` bucket and update stored photo URLs. The rate limiter is currently in-memory and is not shared across Worker instances; move it to a shared store before opening a real election. Test OTP delivery on the deployed Worker—if your SMTP provider requires unsupported direct TCP connections, use an email provider with an HTTP API.

## Running an election

1. Sign in at `/login` (Admin tab) as the superadmin.
2. **Voters** → add students one by one or bulk import lines of `Full Name, Index Number, Email`. Index numbers use the format `FCM.00.000.000.00` and emails must be UMAT student emails (`cy-name1234@st.umat.edu.gh`).
3. **Elections** → create an election, then open its detail page to add positions (President, Secretary, Financial Secretary, Women's Commissioner, ...) and at least 2 candidates per position.
4. Click **Open voting** (positions/candidates lock once open).
5. Students go to `/activate`, receive a 6-digit code by email, set a password, and vote at `/vote`.
6. Watch live collation under **Results**; export a CSV when done. Click **Close voting** to finalize — winners are then highlighted.

## Default accounts (dev seed)

| Account | Credentials |
| --- | --- |
| Superadmin | `superadmin@acses.org` / `ChangeMe123!` (change via env before seeding) |
| Demo voters | e.g. `FCM.21.101.203.01` / `cs-amina1001@st.umat.edu.gh` / `Vote1234!` |

## Production checklist

- Set a strong unique `AUTH_SECRET` and strong superadmin credentials
- Configure SMTP so activation codes are emailed (never rely on console output)
- Set `ALLOWED_EMAIL_DOMAINS` to your school's domain(s)
- Serve over HTTPS (HSTS header is already configured)
- Back up the Neon database and verify that migrations are applied
- Remove demo data by reseeding without `SEED_DEMO`
