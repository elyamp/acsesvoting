# ACSES Online Voting Platform

Secure online elections for the **Association of Computer Science and Engineering Students (ACSES)**.

Built with Next.js 16 (App Router), Prisma + Neon PostgreSQL, Vercel Blob for candidate photos, JWT sessions (jose), bcrypt password hashing, and Zod validation.

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

Copy `.env.example` to `.env`, create a Neon PostgreSQL database, and fill in both its pooled and direct connection URLs. Use the pooled URL for `DATABASE_URL` and the direct (non-pooler) URL for `DIRECT_URL`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled PostgreSQL URL used by the application |
| `DIRECT_URL` | Neon direct PostgreSQL URL used by Prisma migrations |
| `AUTH_SECRET` | Unique, long random string used to sign sessions and anonymous ballots; do not rotate while signed ballots exist |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated list of allowed school email domains (defaults to `st.umat.edu.gh`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | SMTP settings for voter activation codes. Gmail/Workspace generally requires an App Password. |
| `NEXT_PUBLIC_APP_URL` | Public site URL used in activation emails |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token used for candidate photos |

Set a unique `SUPERADMIN_EMAIL` and strong `SUPERADMIN_PASSWORD` in your local environment for the seed command. Apply migrations and create the first administrator:

```bash
npm run db:setup
```

This project now uses PostgreSQL in local development as well as on Vercel. A local `.env` therefore needs valid Neon (or another PostgreSQL) URLs.

Optional demo data (sample election + demo voters with password `Vote1234!`) is for a non-production database only:

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

## Deploying to Vercel for testing

This project uses the standard Next.js Node.js runtime on Vercel. Before deployment, create a Neon PostgreSQL database and a Vercel Blob store. Configure these Vercel Project Environment Variables for both Preview and Production (do not commit credentials):

- `DATABASE_URL`: Neon pooled connection string (`-pooler` host).
- `DIRECT_URL`: Neon direct, non-pooled connection string.
- `AUTH_SECRET`: a unique random value of at least 32 bytes. Keep it stable; ballot signatures cannot be verified if it changes.
- `ALLOWED_EMAIL_DOMAINS`: normally `st.umat.edu.gh`.
- `SMTP_HOST`: `smtp.gmail.com` for Gmail or Workspace SMTP.
- `SMTP_PORT`: `587` (STARTTLS) or `465` (TLS).
- `SMTP_USER`: full Gmail/Workspace email address.
- `SMTP_PASS`: Google App Password where required; do not use or publish your regular account password.
- `SMTP_FROM`: a sender address permitted by that mail account.
- `NEXT_PUBLIC_APP_URL`: the HTTPS Vercel URL for the environment.
- `BLOB_READ_WRITE_TOKEN`: supplied by linking/creating the Vercel Blob store.

For Gmail, enable 2-Step Verification and create an App Password if the account supports it. Workspace administrators may need to permit SMTP access. Test delivery to a mailbox you control before adding test voters.

Apply the PostgreSQL migrations from a trusted machine with the Neon URLs in `.env`:

```bash
npm run db:deploy
```

Set `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` locally and seed the initial administrator with `npm run db:seed`. Do not set `SEED_DEMO=true` for a hosted database. Then import the Git repository into Vercel and deploy. The `build` script generates the Prisma Client and runs the Next.js production build.

Candidate photos are uploaded to Vercel Blob and are public images. Voter-list uploads and image uploads are limited to 4 MB so requests remain within the serverless function request-size limit.

### Test deployment precautions

- Use a clearly labeled test election and authorized test voters; do not use a live election without formal approval.
- Real email delivery means activation codes will be sent to the entered addresses. Use test addresses you control or obtain permission before sending to other people.
- The rate limiter is currently in-memory and is not shared across Vercel function instances. It is suitable only for controlled testing, not as a production abuse-prevention guarantee.
- Keep database backups and test recovery procedures before any operational use.
- The legacy `wrangler.jsonc` file is not used by the Vercel build.

## Running an election

1. Sign in at `/login` (Admin tab) as the superadmin.
2. **Voters** → add students one by one with their class or bulk import up to 300 students for one class at a time. Upload `.xlsx` workbooks or `.csv` files; for workbooks, choose a worksheet, review or correct the detected header and name/index/email columns, and inspect row validation before importing. Invalid rows and duplicates within the file are skipped; existing register entries are reported in the import summary. Uploads are limited to 4 MB. You can also paste CSV rows in `Full Name, Index Number, Email` order. Supported classes are CE 1–4, CY 1–4, IS 1–4, and Robotics 1–4. Index numbers use the format `FCM.00.000.000.00`; email addresses must use an allowed school domain.
3. **Elections** → create an election and set its start time and closing method. Choose automatic closing and a date/time, or leave it to be closed manually. Times are entered in the administrator's local timezone.
4. Open the election detail page, add each position (President, Secretary, Financial Secretary, Women's Commissioner, ...), add at least 2 candidates to each position, and upload candidate photos.
5. Click **Open voting** when the ballot is ready. Positions and candidates lock once voting opens. An administrator can also click **Close voting** at any time; scheduled elections close automatically at their selected end time. Open student ballots check the election status continuously; when it closes, candidate selection and submission are disabled and any unsubmitted selections are cleared. The server also refuses any ballot transaction after closure.
6. Students go to `/activate`. Their index number and school email must match the voter register; they receive a 6-digit code, set a password, and vote at `/vote`.
7. Watch live collation under **Results**. Results and CSV export are available only when signed ballot records pass integrity verification. Winners are highlighted after voting closes.

## Initial administrator and demo accounts

There is no default administrator password. Set `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` explicitly before running `npm run db:seed`. Demo voter credentials are created only when non-production demo seeding is explicitly enabled; never enable demo seeding for a hosted test or production database.

## Production checklist

- Set a strong unique `AUTH_SECRET` and strong superadmin credentials
- Configure SMTP so activation codes are emailed (never rely on console output)
- Set `ALLOWED_EMAIL_DOMAINS` to your school's domain(s)
- Serve over HTTPS (HSTS header is already configured)
- Keep `AUTH_SECRET` protected and stable; ballot signatures do not protect against a compromised application host or secret
- Back up the database and verify that migrations are applied
- Keep demo data out of hosted databases and remove test voter data before any live-election use
