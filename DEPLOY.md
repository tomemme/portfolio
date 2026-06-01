# Portfolio Tech Stack And Deployment Flow

This document tracks how `tomemme.com` is built, configured, deployed, and verified.

## Tech Stack

- Runtime: Node.js `20.x`, declared in `package.json`.
- Server: Express, started by `node server.js`.
- Frontend: static HTML, CSS, and browser JavaScript from `public/`.
- Styling: Bootstrap-based static pages plus local CSS files.
- Email: Nodemailer using Gmail SMTP.
- Form protection: `express-rate-limit` on `/submit-contact`.
- Input validation/sanitization: `validator`.
- Storage: local JSON files written by the app at runtime:
  - `submissions.json`
  - `onboarding-submissions.json`
- Runtime logs are intentionally ignored by git because they can contain client information.

## Main App Behavior

- Static pages are served from `public/`.
- `server.js` redirects `tomemme.com` to `https://www.tomemme.com`.
- Legacy `.html` routes redirect to cleaner URLs where configured.
- `/submit-contact` handles both:
  - Basic portfolio contact submissions.
  - TIS onboarding submissions from `/tis`.
- TIS onboarding compiles `public/nda.md`, emails the customized NDA, and creates a confirmation link.
- `/confirm-onboarding/:token` records NDA confirmation in `onboarding-submissions.json`.

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

Required:

- `GMAIL_USER`: Gmail address used by Nodemailer.
- `GMAIL_APP_PASSWORD`: Gmail app password for SMTP auth.
- `PORT`: supplied automatically by Heroku.

Set or update values:

```bash
heroku config:set GMAIL_USER=your-address@gmail.com
heroku config:set GMAIL_APP_PASSWORD=your-app-password
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

Test TIS onboarding:

1. Open `https://www.tomemme.com/tis`.
2. Submit the onboarding form with a test email you control.
3. Confirm the client email includes the rendered NDA and confirmation link.
4. Click the confirmation link.
5. Check Heroku logs for errors.

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
