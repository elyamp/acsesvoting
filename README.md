# ACSES Online Voting Platform

Secure online elections for the **Association of Computer Science and Engineering Students (ACSES)**.

Built with Next.js 16 (App Router), Prisma + SQLite for local development (Neon PostgreSQL when hosted), JWT sessions (jose), bcrypt password hashing, and zod validation.

## Features

- **Students** sign in with their index number (`FCM.00.000.000.00`) + UMAT school email + password
- **Class-organized voter register** — only pre-registered students can activate; import up to 300 students per class
- **Email OTP activation** — first-time voters verify a 6-digit code sent to their school email before setting a password
- **Anonymous, signed ballots** — HMAC-signed ballot records have no voter ID; results and CSV exports are withheld if integrity checks fail
- **One vote per student** — enforced atomically in a database transaction
- **Admin console** — manage elections, positions, candidates, voters (single + bulk import), open/close voting, live results, CSV export, audit log
- **Roles** — `ADMIN` (run elections, view results) and `SUPERADMIN` (additionally manages admins, can delete drafts and remove voters)
- **Security** — httpOnly signed session cookies, bcrypt hashing, rate limiting on login/OTP/voting, security headers, input validation everywhere, full audit trail (actions only, never vote choices)

## Getting started

```bash
npm install
```

Copy `.env.example` to `.env`. The default database is a local SQLite file at `prisma/dev.db`; no hosted database is needed for local development. Set:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Local SQLite database URL (default: `file:./dev.db`) |
| `AUTH_SECRET` | Stable, long random string used to sign sessions and anonymous ballots; do not rotate while signed ballots exist |
| `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` | Credentials seeded for the first superadmin |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated list of allowed school email domains (defaults to `st.umat.edu.gh`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional; sends real OTP emails. Without SMTP, codes are printed to the server console in development. |

Create the local database schema and seed the superadmin:

```bash
npm run db:setup
```

Optional demo data (sample election + 4 activated voters with password `Vote1234!`):

```bash
# Windows (Git Bash)
SEED_DEMO=true npm run db:seed
# PowerShell
$env:SEED_DEMO="true"; npm run db:seed
```

To replace the local development voter and ballot data with a labeled demo register (48 voters and signed demo ballots), run:

```bash
npm run db:seed-demo-register
```

This replaces voter, vote, OTP, and signed-ballot records in the local SQLite database. It refuses to run in production or against a non-local database. Do not run it against hosted election data.

Start the app:

```bash
npm run dev        # development
npm run build && npm start   # production
```

Local development uses `prisma db push` rather than migrations. The existing PostgreSQL migration is retained for the future hosted setup.

## Deploying to Cloudflare Workers

The app uses the OpenNext Cloudflare adapter. Candidate photos are stored in R2; the Next.js incremental cache uses a separate R2 bucket. Edit the bucket names and Worker name in `wrangler.jsonc` if you want different names.

The current app configuration is for local SQLite development and is not ready to deploy. Before hosting, switch the Prisma datasource back to PostgreSQL, restore the Neon Prisma adapter in `src/lib/prisma.ts`, configure `DATABASE_URL` and `DIRECT_URL`, and apply the PostgreSQL migrations. Keep `AUTH_SECRET` stable so existing signed ballots remain verifiable.

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
2. **Voters** → add students one by one with their class or bulk import up to 300 students for one class at a time. Upload `.xlsx` workbooks or `.csv` files; for workbooks, choose a worksheet, review or correct the detected header and name/index/email columns, and inspect row validation before importing. Invalid rows and duplicates within the file are skipped; existing register entries are reported in the import summary. Uploads are limited to 5 MB. You can also paste CSV rows in `Full Name, Index Number, Email` order. Supported classes are CE 1–4, CY 1–4, IS 1–4, and Robotics 1–4. Index numbers use the format `FCM.00.000.000.00`; email addresses must use an allowed school domain.
3. **Elections** → create an election and set its start time and closing method. Choose automatic closing and a date/time, or leave it to be closed manually. Times are entered in the administrator's local timezone.
4. Open the election detail page, add each position (President, Secretary, Financial Secretary, Women's Commissioner, ...), add at least 2 candidates to each position, and upload candidate photos.
5. Click **Open voting** when the ballot is ready. Positions and candidates lock once voting opens. An administrator can also click **Close voting** at any time; scheduled elections close automatically at their selected end time. Open student ballots check the election status continuously; when it closes, candidate selection and submission are disabled and any unsubmitted selections are cleared. The server also refuses any ballot transaction after closure.
6. Students go to `/activate`. Their index number and school email must match the voter register; they receive a 6-digit code, set a password, and vote at `/vote`.
7. Watch live collation under **Results**. Results and CSV export are available only when signed ballot records pass integrity verification. Winners are highlighted after voting closes.

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
- Keep `AUTH_SECRET` protected and stable; ballot signatures do not protect against a compromised application host or secret
- Back up the database and verify that migrations are applied
- Remove demo data by reseeding without `SEED_DEMO`
