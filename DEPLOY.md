# Portfolio Tech Stack And Deployment Flow

This document tracks how `tomemme.com` is built, configured, deployed, and verified.

## Tech Stack

- Runtime: Node.js `20.x`, declared in `package.json`.
- Server: Express, started by `node server.js`.
- Frontend: static HTML, CSS, and browser JavaScript from `public/`.
- Styling: Bootstrap-based static pages plus local CSS files.
- Email: Nodemailer using either Gmail SMTP fallback vars or explicit SMTP provider vars.
- Form protection: hidden honeypot, Cloudflare Turnstile, and `express-rate-limit` on `/submit-contact`.
- Input validation/sanitization: `validator`.
- Storage: local JSON files written by the app at runtime:
  - `submissions.json`
  - `onboarding-submissions.json`
  - `calendly-bookings.json`
- Runtime logs are intentionally ignored by git because they can contain client information.

## Main App Behavior

- Static pages are served from `public/`.
- `server.js` redirects `tomemme.com` to `https://www.tomemme.com`.
- Legacy `.html` routes redirect to cleaner URLs where configured.
- `/submit-contact` handles both:
  - Basic portfolio contact submissions.
  - Legacy TIS onboarding submissions if an older form is used.
- `/schedule` redirects to `CALENDLY_URL` when configured, or back to `/tis#signup` as a safe fallback.
- `/admin/send-nda?token=<NDA_ADMIN_TOKEN>` opens a private manual form for sending an NDA from Calendly booking details. It can also accept `name`, `email`, `companyName`, `signerTitle`, and `message` query values to prefill the form from an admin-only email link.
- `/calendly-webhook` can receive a Calendly booking payload, store the booking, and email an admin-only NDA trigger link.
- `/trigger-nda/:token` sends the NDA from a stored Calendly booking when Tom chooses to trigger it during or after the call.
- TIS onboarding compiles `public/nda.md`, emails the customized NDA, and creates a confirmation link.
- The NDA source stays in Markdown, but client emails render it as mobile-friendly HTML and attach an `.html` copy.
- `/confirm-onboarding/:token` records NDA confirmation in `onboarding-submissions.json`.
- The internal onboarding email does not include the confirmation link, because clicking that link confirms the NDA.
- When the client confirms, the app sends an admin notification email and logs the confirmation.

## Production Hosting

- Hosting provider: Heroku.
- Heroku remote:
  - `https://git.heroku.com/tomemme-portfolio.git`
- Domain/DNS provider: GoDaddy.
- Production canonical domain:
  - `https://www.tomemme.com`

## Required Heroku Config Vars

Check production values before deploying email or onboarding changes:

```bash
heroku config
```

Required for the current Gmail-based setup:

- `GMAIL_USER`: Gmail address used by Nodemailer.
- `GMAIL_APP_PASSWORD`: Gmail app password for SMTP auth.
- `PORT`: supplied automatically by Heroku.
- `ADMIN_EMAIL`: business inbox that receives internal lead notifications. Defaults to `tomemme@outlook.com`.
- `MAIL_REPLY_TO`: address clients reply to. Defaults to `ADMIN_EMAIL`.
- `MAIL_FROM_NAME`: display name for outgoing mail. Defaults to `Tech Integration Solutions`.
- `CALENDLY_URL`: scheduling link for the 15-minute workflow audit. If unset, `/schedule` falls back to `/tis#signup`.
- `NDA_ADMIN_TOKEN`: required private token for the manual `Send NDA` page.
- `CALENDLY_WEBHOOK_TOKEN`: optional shared token for `/calendly-webhook`.
- `TURNSTILE_SITE_KEY`: public Cloudflare Turnstile site key rendered on the contact form.
- `TURNSTILE_SECRET_KEY`: private Cloudflare Turnstile secret key used by the server to verify submissions.

Set or update values:

```bash
heroku config:set GMAIL_USER=your-address@gmail.com
heroku config:set GMAIL_APP_PASSWORD=your-app-password
heroku config:set ADMIN_EMAIL=tomemme@outlook.com
heroku config:set MAIL_REPLY_TO=tomemme@outlook.com
heroku config:set MAIL_FROM_NAME="Tech Integration Solutions"
heroku config:set CALENDLY_URL=https://calendly.com/your-user/15-minute-workflow-audit
heroku config:set NDA_ADMIN_TOKEN=make-a-long-random-secret
heroku config:set TURNSTILE_SITE_KEY=your-cloudflare-turnstile-site-key
heroku config:set TURNSTILE_SECRET_KEY=your-cloudflare-turnstile-secret-key
```

Cloudflare Turnstile setup:

1. In Cloudflare, open `Turnstile`.
2. Add a new widget for `www.tomemme.com`.
3. Choose a managed, non-interactive widget for the least friction.
4. Copy the generated site key into `TURNSTILE_SITE_KEY`.
5. Copy the generated secret key into `TURNSTILE_SECRET_KEY`.
6. Deploy the app and confirm `/contact` renders the Turnstile widget.

Contact form anti-spam behavior:

- The form includes a hidden `company_website` honeypot field. If it contains any value, `/submit-contact` returns HTTP `400` and does not send email.
- Turnstile must verify successfully before the app stores a submission, sends a contact email, or starts onboarding.
- Rate limiting allows a maximum of 5 verified contact submissions per IP per hour. Exceeded requests return HTTP `429` and log a rate-limit violation.
- Contact attempts log timestamp, IP address, user agent, submitted email, Turnstile result, honeypot status, rate-limit status, and acceptance status.
- Contact input is sanitized, email format is validated, HTML is escaped before email rendering, and message bodies over 5000 characters are rejected.

Free Calendly manual NDA flow:

- Use Calendly normally for the 15-minute audit.
- During or after the call, open:

```text
https://www.tomemme.com/admin/send-nda?token=<NDA_ADMIN_TOKEN>
```

- Paste the client name, email, company, title, and workflow note from the Calendly booking. If the private link already includes those values, quickly review the prefilled form instead.
- Click `Send NDA`.
- The app sends the NDA without asking the client to fill out the same information again.

Optional paid Calendly webhook setup:

- Webhooks are what let the app reuse booking details instead of asking the client to fill out the same information again.
- Configure Calendly to call:

```text
https://www.tomemme.com/calendly-webhook?token=<CALENDLY_WEBHOOK_TOKEN>
```

- For the 15-minute audit event, collect these questions in Calendly:
  - Company name
  - Job title or role
  - What repetitive workflow is costing you time?
- When a booking arrives, the app stores it in `calendly-bookings.json` and emails the admin inbox a private `Review and Send NDA` button plus a direct `Send NDA` trigger link.
- Click the private trigger during or after the call only when an NDA is actually needed.

With Gmail SMTP, Gmail may still show or authenticate the sender as the Gmail account. This is normal and better than spoofing. Client replies should go to `MAIL_REPLY_TO`.

To make mail truly send from `tomemme@outlook.com`, configure an Outlook/Microsoft SMTP account instead:

```bash
heroku config:set SMTP_HOST=smtp.office365.com
heroku config:set SMTP_PORT=587
heroku config:set SMTP_SECURE=false
heroku config:set SMTP_USER=tomemme@outlook.com
heroku config:set SMTP_PASS=your-outlook-smtp-password
heroku config:set MAIL_FROM_ADDRESS=tomemme@outlook.com
heroku config:set MAIL_REPLY_TO=tomemme@outlook.com
heroku config:set ADMIN_EMAIL=tomemme@outlook.com
heroku config:unset GMAIL_USER GMAIL_APP_PASSWORD
```

## Manual Deploy Flow

1. Review local changes:

```bash
git status
git diff
```

2. Run a quick syntax check:

```bash
node --check server.js
```

3. Commit the intended files:

```bash
git add .gitignore DEPLOY.md package.json package-lock.json public/tis.html public/nda.md server.js
git commit -m "Add TIS onboarding pipeline"
```

4. Push to Heroku:

```bash
git push heroku main
```

If deploying from a non-main local branch:

```bash
git push heroku HEAD:main
```

## Verify After Deploy

Open the live site:

```bash
heroku open
```

Watch logs:

```bash
heroku logs --tail
```

Check these URLs manually:

- `https://www.tomemme.com/`
- `https://www.tomemme.com/tis`
- `https://www.tomemme.com/projects`
- `https://www.tomemme.com/sitemap.xml`
- `https://www.tomemme.com/journal-tour`
- `https://www.tomemme.com/contact`

Contact form testing checklist:

1. Load `/contact` and confirm the Turnstile widget appears.
2. Submit a normal test lead and confirm the browser shows success, the submission is saved, and the admin email is sent.
3. Submit with an invalid email address and confirm HTTP `400` with no email sent.
4. Submit a message longer than 5000 characters and confirm HTTP `400` with no email sent.
5. Submit with `company_website` populated using browser dev tools or `curl` and confirm HTTP `400` with no email sent.
6. Submit without a Turnstile token and confirm HTTP `400` with no email sent.
7. Submit more than 5 verified requests from the same IP within one hour and confirm HTTP `429`.
8. Check Heroku logs and confirm each attempt includes timestamp, IP address, user agent, email, Turnstile result, and honeypot status.

Test TIS onboarding:

1. Open `https://www.tomemme.com/tis`.
2. Tap `Book a 15-Minute Workflow Audit` and confirm `/schedule` reaches the configured Calendly URL.
3. Book a test Calendly meeting with a test email you control.
4. Open the private manual NDA page and paste the booking details.
5. Click `Send NDA`.
6. Confirm the client email receives the rendered NDA and confirmation link.
7. Click the client confirmation link from the client inbox.
8. Confirm the admin inbox receives a `TIS NDA confirmed...` notification.
9. Check Heroku logs for errors.

Do not click a client confirmation link from an internal/admin copy of an email. The confirmation URL is a bearer token, so whoever opens it records the NDA as confirmed.

## Moving Toward Auto Deploy

Current deploy is manual with:

```bash
git push heroku main
```

Preferred next step:

- Connect the Heroku app to the GitHub repo `tomemme/portfolio`.
- Enable automatic deploys from the `main` branch in the Heroku dashboard.
- Keep manual deploys available as a fallback.

Recommended safety check before enabling auto deploy:

- Confirm production config vars are present.
- Confirm `main` is the production branch.
- Add at least one automated smoke check later if this app grows beyond static pages and contact/onboarding flows.

## If Deploy Fails

1. Check logs:

```bash
heroku logs --tail
```

2. Confirm `Procfile` still contains:

```text
web: node server.js
```

3. Confirm `package.json` still contains:

```json
"start": "node server.js"
```

4. Confirm the Heroku remote:

```bash
git remote -v
```
