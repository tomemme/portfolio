const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const validator = require('validator');
const app = express();
app.set('trust proxy', true);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'tomemme@outlook.com';
const SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER;
const SMTP_PASS = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
const MAIL_FROM_ADDRESS = process.env.MAIL_FROM_ADDRESS || SMTP_USER || ADMIN_EMAIL;
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'Tech Integration Solutions';
const MAIL_FROM = process.env.MAIL_FROM || `${MAIL_FROM_NAME} <${MAIL_FROM_ADDRESS}>`;
const MAIL_REPLY_TO = process.env.MAIL_REPLY_TO || ADMIN_EMAIL;
const CALENDLY_URL = process.env.CALENDLY_URL || '/tis#signup';
const CALENDLY_WEBHOOK_TOKEN = process.env.CALENDLY_WEBHOOK_TOKEN;
const NDA_ADMIN_TOKEN = process.env.NDA_ADMIN_TOKEN;
const SUBMISSIONS_PATH = path.join(__dirname, 'submissions.json');
const ONBOARDING_PATH = path.join(__dirname, 'onboarding-submissions.json');
const CALENDLY_BOOKINGS_PATH = path.join(__dirname, 'calendly-bookings.json');
const NDA_TEMPLATE_PATH = path.join(__dirname, 'public', 'nda.md');

const transporterOptions = process.env.SMTP_HOST
    ? {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    }
    : {
        service: 'gmail',
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    };

const transporter = nodemailer.createTransport(transporterOptions);

// Middleware to parse JSON bodies for form submissions
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    message: { message: 'Too many submissions. Please try again later.' }
});

const readJsonArray = async (filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(`Unable to read ${path.basename(filePath)}:`, error.message);
        }
        return [];
    }
};

const writeJsonArray = async (filePath, records) => {
    await fs.writeFile(filePath, JSON.stringify(records, null, 2));
};

const cleanText = (value, maxLength = 1000) => {
    if (typeof value !== 'string') {
        return '';
    }

    return validator.stripLow(value.trim(), true).slice(0, maxLength);
};

const escapeHtml = (value) => validator.escape(String(value));

const hasValidAdminToken = (req) => Boolean(NDA_ADMIN_TOKEN) && req.query.token === NDA_ADMIN_TOKEN;

const renderSendNdaForm = ({ token, values = {}, error = '' }) => `
    <!doctype html>
    <html lang="en">
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Send NDA</title>
            <style>
                body { background: #f4f7fb; color: #1f2933; font-family: Arial, sans-serif; line-height: 1.5; margin: 0; padding: 24px 12px; }
                main { background: #fff; border: 1px solid #d8dee5; border-radius: 8px; margin: 0 auto; max-width: 720px; padding: 24px; }
                h1 { font-size: 1.7rem; margin: 0 0 8px; }
                p { color: #52616f; margin: 0 0 20px; }
                label { display: block; font-weight: 700; margin: 16px 0 6px; }
                input, textarea { border: 1px solid #c9d2dc; border-radius: 6px; box-sizing: border-box; font: inherit; min-height: 48px; padding: 10px 12px; width: 100%; }
                textarea { min-height: 128px; resize: vertical; }
                button { background: #0d6efd; border: 0; border-radius: 6px; color: #fff; cursor: pointer; font: inherit; font-weight: 700; margin-top: 20px; min-height: 48px; padding: 12px 18px; width: 100%; }
                .error { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; color: #9f1239; padding: 12px; }
            </style>
        </head>
        <body>
            <main>
                <h1>Send NDA</h1>
                <p>Paste details from the Calendly booking, then send the NDA without asking the client to enter the same information again.</p>
                ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
                <form method="POST" action="/admin/send-nda?token=${encodeURIComponent(token)}">
                    <label for="name">Client Name</label>
                    <input id="name" name="name" required value="${escapeHtml(values.name || '')}" />

                    <label for="email">Client Email</label>
                    <input id="email" name="email" type="email" required value="${escapeHtml(values.email || '')}" />

                    <label for="companyName">Company Name</label>
                    <input id="companyName" name="companyName" required value="${escapeHtml(values.companyName || '')}" />

                    <label for="signerTitle">Title / Role</label>
                    <input id="signerTitle" name="signerTitle" required value="${escapeHtml(values.signerTitle || 'Authorized Representative')}" />

                    <label for="message">Workflow Note</label>
                    <textarea id="message" name="message" required>${escapeHtml(values.message || '')}</textarea>

                    <button type="submit">Send NDA</button>
                </form>
            </main>
        </body>
    </html>
`;

const renderInlineMarkdown = (value) => escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

const renderMarkdownDocument = (markdown) => {
    const lines = markdown.split(/\r?\n/);
    const html = [];
    let inList = false;

    const closeList = () => {
        if (inList) {
            html.push('</ul>');
            inList = false;
        }
    };

    lines.forEach((line) => {
        const trimmed = line.trim();

        if (!trimmed) {
            closeList();
            return;
        }

        if (trimmed === '---') {
            closeList();
            html.push('<hr />');
            return;
        }

        if (trimmed.startsWith('# ')) {
            closeList();
            html.push(`<h1>${renderInlineMarkdown(trimmed.slice(2))}</h1>`);
            return;
        }

        if (trimmed.startsWith('### ')) {
            closeList();
            html.push(`<h2>${renderInlineMarkdown(trimmed.slice(4))}</h2>`);
            return;
        }

        if (trimmed.startsWith('* ')) {
            if (!inList) {
                html.push('<ul>');
                inList = true;
            }

            html.push(`<li>${renderInlineMarkdown(trimmed.slice(2))}</li>`);
            return;
        }

        closeList();
        html.push(`<p>${renderInlineMarkdown(trimmed.replace(/\s{2,}$/g, ''))}</p>`);
    });

    closeList();
    return html.join('\n');
};

const buildStandaloneNdaHtml = ({ companyName, renderedNda }) => `
    <!doctype html>
    <html lang="en">
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Tech Integration Solutions NDA - ${escapeHtml(companyName)}</title>
            <style>
                body { color: #1f2933; font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 24px; }
                main { margin: 0 auto; max-width: 760px; }
                h1 { font-size: 24px; line-height: 1.25; margin: 0 0 20px; }
                h2 { font-size: 18px; margin: 28px 0 8px; }
                p { margin: 0 0 12px; }
                ul { margin: 0 0 16px; padding-left: 22px; }
                li { margin: 0 0 8px; }
                hr { border: 0; border-top: 1px solid #d8dee5; margin: 24px 0; }
            </style>
        </head>
        <body>
            <main>${renderMarkdownDocument(renderedNda)}</main>
        </body>
    </html>
`;

const compileNda = async ({ name, companyName, signerTitle }) => {
    const template = await fs.readFile(NDA_TEMPLATE_PATH, 'utf8');
    const effectiveDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return template
        .replaceAll('{{EFFECTIVE_DATE}}', effectiveDate)
        .replaceAll('{{CLIENT_NAME}}', companyName)
        .replaceAll('{{CLIENT_REPRESENTATIVE}}', name)
        .replaceAll('{{CLIENT_TITLE}}', signerTitle);
};

const getBaseUrl = (req) => {
    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    return `${protocol}://${host}`;
};

const buildNdaEmailHtml = ({ name, companyName, message, renderedNda, confirmationUrl }) => `
    <div style="background: #f4f7fb; margin: 0; padding: 24px 12px;">
        <div style="background: #ffffff; border: 1px solid #d8dee5; border-radius: 8px; color: #1f2933; font-family: Arial, sans-serif; line-height: 1.6; margin: 0 auto; max-width: 680px; overflow: hidden;">
            <div style="padding: 24px 20px;">
                <p style="margin: 0 0 12px;">Hello ${escapeHtml(name)},</p>
                <p style="margin: 0 0 12px;">Thank you for starting the onboarding process with Tech Integration Solutions.</p>
                <p style="margin: 0 0 20px;">Please review the NDA below. If the terms are acceptable, use the confirmation button.</p>
                <p style="margin: 0 0 24px;">
                    <a href="${escapeHtml(confirmationUrl)}" style="background: #0d6efd; border-radius: 6px; color: #ffffff; display: inline-block; font-weight: bold; padding: 12px 18px; text-decoration: none;">Confirm NDA Terms</a>
                </p>
                <p style="font-size: 14px; margin: 0 0 6px;"><strong>Your project note</strong></p>
                <blockquote style="border-left: 3px solid #64a19d; color: #52616f; margin: 0 0 24px; padding: 0 0 0 12px;">${escapeHtml(message)}</blockquote>
                <p style="font-size: 14px; margin: 0 0 12px;"><strong>Customized NDA for ${escapeHtml(companyName)}</strong></p>
                <div style="border-top: 1px solid #d8dee5; padding-top: 18px;">
                    ${renderMarkdownDocument(renderedNda)}
                </div>
            </div>
        </div>
    </div>
`;

const buildInternalOnboardingHtml = ({ name, companyName, signerTitle, email, message, timestamp }) => `
    <p><strong>New TIS onboarding request</strong></p>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Company:</strong> ${escapeHtml(companyName)}</p>
    <p><strong>Title:</strong> ${escapeHtml(signerTitle)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Message:</strong> ${escapeHtml(message)}</p>
    <p><strong>Timestamp:</strong> ${escapeHtml(timestamp)}</p>
    <p><strong>NDA status:</strong> Sent to client. Waiting for client confirmation.</p>
    <p>The client-only confirmation link was sent to ${escapeHtml(email)}.</p>
`;

const buildInternalConfirmationHtml = ({ name, companyName, signerTitle, email, confirmedAt, confirmedIp, confirmedUserAgent }) => `
    <p><strong>TIS NDA confirmed</strong></p>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Company:</strong> ${escapeHtml(companyName)}</p>
    <p><strong>Title:</strong> ${escapeHtml(signerTitle)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Confirmed at:</strong> ${escapeHtml(confirmedAt)}</p>
    <p><strong>Confirmation IP:</strong> ${escapeHtml(confirmedIp || 'Not recorded')}</p>
    <p><strong>User agent:</strong> ${escapeHtml(confirmedUserAgent || 'Not recorded')}</p>
`;

const buildCalendlyBookingHtml = ({ name, companyName, signerTitle, email, message, scheduledAt, triggerUrl }) => `
    <p><strong>Workflow audit booked</strong></p>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Company:</strong> ${escapeHtml(companyName)}</p>
    <p><strong>Title:</strong> ${escapeHtml(signerTitle)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Scheduled time:</strong> ${escapeHtml(scheduledAt || 'See Calendly event')}</p>
    <p><strong>Workflow note:</strong> ${escapeHtml(message)}</p>
    <p>Use this private link during or after the call if an NDA is needed:</p>
    <p><a href="${escapeHtml(triggerUrl)}">Send NDA to ${escapeHtml(email)}</a></p>
`;

const sendOnboardingNda = async ({ req, name, companyName, signerTitle, email, message, source = 'tis-form' }) => {
    const timestamp = new Date().toISOString();
    const renderedNda = await compileNda({ name, companyName, signerTitle });
    const renderedNdaHtml = buildStandaloneNdaHtml({ companyName, renderedNda });
    const token = crypto.randomBytes(32).toString('hex');
    const confirmationUrl = `${getBaseUrl(req)}/confirm-onboarding/${token}`;
    const onboardingRecord = {
        type: 'tis-onboarding',
        source,
        name,
        companyName,
        signerTitle,
        email,
        message,
        renderedNda,
        confirmationToken: token,
        status: 'sent',
        createdAt: timestamp,
        confirmedAt: null,
        confirmedIp: null,
        confirmedUserAgent: null
    };

    const onboardingRecords = await readJsonArray(ONBOARDING_PATH);
    onboardingRecords.push(onboardingRecord);
    await writeJsonArray(ONBOARDING_PATH, onboardingRecords);

    const clientMailOptions = {
        from: MAIL_FROM,
        replyTo: MAIL_REPLY_TO,
        to: email,
        subject: 'Tech Integration Solutions onboarding NDA',
        text: `Hello ${name},

Thank you for starting the onboarding process with Tech Integration Solutions.

Please review the NDA below. If the terms are acceptable, confirm them here:
${confirmationUrl}

Your project note:
${message}

${renderedNda}`,
        html: buildNdaEmailHtml({ name, companyName, message, renderedNda, confirmationUrl }),
        attachments: [
            {
                filename: 'Tech-Integration-Solutions-NDA.html',
                content: renderedNdaHtml,
                contentType: 'text/html'
            }
        ]
    };

    const internalMailOptions = {
        from: MAIL_FROM,
        replyTo: email,
        to: ADMIN_EMAIL,
        subject: `New TIS onboarding request from ${name}`,
        text: `Name: ${name}
Company: ${companyName}
Title: ${signerTitle}
Email: ${email}
Message: ${message}
Source: ${source}
Timestamp: ${timestamp}
NDA status: Sent to client. Waiting for client confirmation.
Client-only confirmation link sent to: ${email}`,
        html: buildInternalOnboardingHtml({ name, companyName, signerTitle, email, message, timestamp })
    };

    try {
        await transporter.sendMail(clientMailOptions);
        await transporter.sendMail(internalMailOptions);
        console.log(`Onboarding NDA sent to ${email}`);
    } catch (error) {
        console.error('Error sending onboarding email:', error.message);
    }

    return onboardingRecord;
};

const findCalendlyAnswer = (answers, patterns) => {
    const match = answers.find(({ question }) => patterns.some((pattern) => pattern.test(question)));
    return match ? match.answer : '';
};

const normalizeCalendlyPayload = (body) => {
    const payload = body.payload || body;
    const answers = Array.isArray(payload.questions_and_answers) ? payload.questions_and_answers : [];
    const normalizedAnswers = answers.map((item) => ({
        question: cleanText(item.question || item.name || '', 160).toLowerCase(),
        answer: cleanText(item.answer || item.value || '', 500)
    }));
    const name = cleanText(payload.name || payload.invitee_name || `${payload.first_name || ''} ${payload.last_name || ''}`, 120);
    const email = cleanText(payload.email || payload.invitee_email, 254);
    const companyName = cleanText(
        payload.company ||
        findCalendlyAnswer(normalizedAnswers, [/company/, /business/, /organization/]) ||
        name,
        160
    );
    const signerTitle = cleanText(
        payload.title ||
        findCalendlyAnswer(normalizedAnswers, [/title/, /role/, /position/]) ||
        'Authorized Representative',
        120
    );
    const workflowPain = cleanText(findCalendlyAnswer(normalizedAnswers, [/workflow/, /pain/, /problem/, /repetitive/]), 1000);
    const eventName = cleanText(payload.scheduled_event && payload.scheduled_event.name, 160);
    const scheduledAt = cleanText(
        payload.scheduled_event && (payload.scheduled_event.start_time || payload.scheduled_event.start_time_pretty),
        160
    );
    const message = workflowPain || `15-Minute Workflow Audit booked${eventName ? `: ${eventName}` : ' through Calendly'}.`;

    return { name, email, companyName, signerTitle, message, scheduledAt };
};

const storeCalendlyBooking = async ({ req, name, companyName, signerTitle, email, message, scheduledAt }) => {
    const timestamp = new Date().toISOString();
    const triggerToken = crypto.randomBytes(32).toString('hex');
    const triggerUrl = `${getBaseUrl(req)}/trigger-nda/${triggerToken}`;
    const bookingRecord = {
        type: 'calendly-booking',
        name,
        companyName,
        signerTitle,
        email,
        message,
        scheduledAt,
        triggerToken,
        status: 'pending-nda',
        createdAt: timestamp,
        ndaSentAt: null,
        onboardingConfirmationToken: null
    };

    const bookings = await readJsonArray(CALENDLY_BOOKINGS_PATH);
    bookings.push(bookingRecord);
    await writeJsonArray(CALENDLY_BOOKINGS_PATH, bookings);

    const mailOptions = {
        from: MAIL_FROM,
        replyTo: email,
        to: ADMIN_EMAIL,
        subject: `Workflow audit booked: ${name}`,
        text: `Workflow audit booked
Name: ${name}
Company: ${companyName}
Title: ${signerTitle}
Email: ${email}
Scheduled time: ${scheduledAt || 'See Calendly event'}
Workflow note: ${message}

Private NDA trigger:
${triggerUrl}`,
        html: buildCalendlyBookingHtml({ name, companyName, signerTitle, email, message, scheduledAt, triggerUrl })
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Calendly booking stored for ${email}`);
    } catch (error) {
        console.error('Error sending Calendly booking notification:', error.message);
    }

    return bookingRecord;
};

// Force production traffic onto the canonical host and scheme.
app.use((req, res, next) => {
    const host = req.headers.host;
    const forwardedProto = req.headers['x-forwarded-proto'];

    if (host === 'tomemme.com') {
        return res.redirect(301, `https://www.tomemme.com${req.originalUrl}`);
    }

    if (host === 'www.tomemme.com' && forwardedProto && forwardedProto !== 'https') {
        return res.redirect(301, `https://www.tomemme.com${req.originalUrl}`);
    }

    next();
});

// Redirect legacy .html URLs to clean routes.
app.use((req, res, next) => {
    if (!req.path.endsWith('.html')) {
        return next();
    }

    const redirects = {
        '/index.html': '/',
        '/home.html': '/retro',
        '/portfolio.html': '/portfolio',
        '/gallery.html': '/retro/gallery',
        '/books.html': '/retro/books',
        '/journalTour.html': '/journal-tour'
    };

    const destination = redirects[req.path] || req.path.replace(/\.html$/, '');
    return res.redirect(301, destination);
});

app.get('/retro', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/portfolio', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'portfolio.html'));
});

app.get('/retro/gallery', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'gallery.html'));
});

app.get('/retro/books', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'books.html'));
});

app.get('/journal-tour', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'journalTour.html'));
});

app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

// Serve static files from the 'public' directory with logging
app.use(express.static(path.join(__dirname, 'public'), {
    extensions: ['html'],
    setHeaders: (res, filePath) => {
        console.log(`Serving static file: ${filePath}`);
    }
}));

app.get('/schedule', (req, res) => {
    res.redirect(302, CALENDLY_URL);
});

app.get('/admin/send-nda', (req, res) => {
    if (!hasValidAdminToken(req)) {
        return res.status(404).send('<h1>Not found</h1>');
    }

    return res.send(renderSendNdaForm({ token: req.query.token }));
});

app.post('/admin/send-nda', async (req, res) => {
    if (!hasValidAdminToken(req)) {
        return res.status(404).send('<h1>Not found</h1>');
    }

    const name = cleanText(req.body.name, 120);
    const email = cleanText(req.body.email, 254);
    const companyName = cleanText(req.body.companyName, 160);
    const signerTitle = cleanText(req.body.signerTitle, 120);
    const message = cleanText(req.body.message, 3000);
    const values = { name, email, companyName, signerTitle, message };

    if (!name || !email || !companyName || !signerTitle || !message) {
        return res.status(400).send(renderSendNdaForm({
            token: req.query.token,
            values,
            error: 'All fields are required.'
        }));
    }

    if (!validator.isEmail(email)) {
        return res.status(400).send(renderSendNdaForm({
            token: req.query.token,
            values,
            error: 'Please enter a valid client email address.'
        }));
    }

    try {
        await sendOnboardingNda({
            req,
            name,
            companyName,
            signerTitle,
            email,
            message,
            source: 'manual-admin'
        });

        return res.send(`
            <!doctype html>
            <html lang="en">
                <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <title>NDA Sent</title>
                    <style>body { font-family: Arial, sans-serif; max-width: 720px; margin: 4rem auto; padding: 0 1rem; line-height: 1.6; }</style>
                </head>
                <body>
                    <h1>NDA sent</h1>
                    <p>The NDA has been sent to ${escapeHtml(email)} using the details you entered from Calendly.</p>
                    <p><a href="/admin/send-nda?token=${encodeURIComponent(req.query.token)}">Send another NDA</a></p>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Error sending manual NDA:', error);
        return res.status(500).send(renderSendNdaForm({
            token: req.query.token,
            values,
            error: 'Unable to send the NDA. Check server logs and try again.'
        }));
    }
});

app.post('/calendly-webhook', async (req, res) => {
    try {
        if (CALENDLY_WEBHOOK_TOKEN) {
            const authHeader = req.get('authorization') || '';
            const requestToken = authHeader.replace(/^Bearer\s+/i, '') || req.query.token;

            if (requestToken !== CALENDLY_WEBHOOK_TOKEN) {
                return res.status(401).json({ message: 'Unauthorized webhook request' });
            }
        }

        const { name, email, companyName, signerTitle, message, scheduledAt } = normalizeCalendlyPayload(req.body);

        if (!name || !email || !validator.isEmail(email)) {
            return res.status(400).json({ message: 'Calendly payload is missing a valid name or email' });
        }

        await storeCalendlyBooking({
            req,
            name,
            companyName,
            signerTitle,
            email,
            message,
            scheduledAt
        });

        return res.json({ message: 'Calendly booking stored. Admin NDA trigger sent.' });
    } catch (error) {
        console.error('Error processing Calendly webhook:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

app.get('/trigger-nda/:token', async (req, res) => {
    try {
        const token = cleanText(req.params.token, 128);

        if (!/^[a-f0-9]{64}$/.test(token)) {
            return res.status(404).send('<h1>NDA trigger not found</h1><p>Please check the link and try again.</p>');
        }

        const bookings = await readJsonArray(CALENDLY_BOOKINGS_PATH);
        const booking = bookings.find((entry) => entry.triggerToken === token);

        if (!booking) {
            return res.status(404).send('<h1>NDA trigger not found</h1><p>Please check the link and try again.</p>');
        }

        if (booking.ndaSentAt) {
            return res.send(`
                <!doctype html>
                <html lang="en">
                    <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1" />
                        <title>NDA Already Sent</title>
                        <style>body { font-family: Arial, sans-serif; max-width: 720px; margin: 4rem auto; padding: 0 1rem; line-height: 1.6; }</style>
                    </head>
                    <body>
                        <h1>NDA already sent</h1>
                        <p>The NDA for ${escapeHtml(booking.name)} at ${escapeHtml(booking.companyName)} was already sent at ${escapeHtml(booking.ndaSentAt)}.</p>
                    </body>
                </html>
            `);
        }

        const onboardingRecord = await sendOnboardingNda({
            req,
            name: booking.name,
            companyName: booking.companyName,
            signerTitle: booking.signerTitle,
            email: booking.email,
            message: booking.message,
            source: 'calendly-trigger'
        });

        booking.status = 'nda-sent';
        booking.ndaSentAt = new Date().toISOString();
        booking.onboardingConfirmationToken = onboardingRecord.confirmationToken;
        await writeJsonArray(CALENDLY_BOOKINGS_PATH, bookings);

        return res.send(`
            <!doctype html>
            <html lang="en">
                <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <title>NDA Sent</title>
                    <style>body { font-family: Arial, sans-serif; max-width: 720px; margin: 4rem auto; padding: 0 1rem; line-height: 1.6; }</style>
                </head>
                <body>
                    <h1>NDA sent</h1>
                    <p>The NDA has been sent to ${escapeHtml(booking.email)} using the information from their Calendly booking.</p>
                    <p>You can continue the call without asking the client to fill out the same information again.</p>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Error triggering NDA from Calendly booking:', error);
        return res.status(500).send('<h1>Server error</h1><p>Unable to send the NDA.</p>');
    }
});

// Handle contact form and TIS onboarding submissions
app.post('/submit-contact', contactLimiter, async (req, res) => {
    try {
        const name = cleanText(req.body.name, 120);
        const email = cleanText(req.body.email, 254);
        const message = cleanText(req.body.message, 3000);
        const companyName = cleanText(req.body.companyName, 160);
        const signerTitle = cleanText(req.body.signerTitle, 120);
        const isOnboarding = Boolean(companyName || signerTitle);

        if (!name || !email || !message) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: 'Please enter a valid email address' });
        }

        if (isOnboarding && (!companyName || !signerTitle)) {
            return res.status(400).json({ message: 'Company name and signer title are required for onboarding' });
        }

        if (isOnboarding) {
            await sendOnboardingNda({ req, name, companyName, signerTitle, email, message });
            return res.json({ message: 'Onboarding started. Please check your inbox for the NDA confirmation email.' });
        }

        const submission = { name, email, message, timestamp: new Date().toISOString() };
        const submissions = await readJsonArray(SUBMISSIONS_PATH);
        submissions.push(submission);
        await writeJsonArray(SUBMISSIONS_PATH, submissions);

        // Send email via Nodemailer
        const mailOptions = {
            from: MAIL_FROM,
            replyTo: email,
            to: ADMIN_EMAIL,
            subject: `New Contact Form Submission from ${name}`,
            text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}\nTimestamp: ${submission.timestamp}`,
            html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p>
                   <p><strong>Email:</strong> ${escapeHtml(email)}</p>
                   <p><strong>Message:</strong> ${escapeHtml(message)}</p>
                   <p><strong>Timestamp:</strong> ${escapeHtml(submission.timestamp)}</p>`
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`Email sent to ${ADMIN_EMAIL} from ${email}`);
        } catch (error) {
            console.error('Error sending email:', error.message);
            // Still respond with success since submission is saved
        }

        res.json({ message: 'Message sent successfully! You will hear from us soon.' });
    } catch (error) {
        console.error('Error processing submission:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/confirm-onboarding/:token', async (req, res) => {
    try {
        const token = cleanText(req.params.token, 128);

        if (!/^[a-f0-9]{64}$/.test(token)) {
            return res.status(404).send('<h1>Confirmation link not found</h1><p>Please contact Tom Emme for assistance.</p>');
        }

        const onboardingRecords = await readJsonArray(ONBOARDING_PATH);
        const record = onboardingRecords.find((entry) => entry.confirmationToken === token);

        if (!record) {
            return res.status(404).send('<h1>Confirmation link not found</h1><p>Please contact Tom Emme for assistance.</p>');
        }

        if (!record.confirmedAt) {
            record.status = 'confirmed';
            record.confirmedAt = new Date().toISOString();
            record.confirmedIp = req.ip;
            record.confirmedUserAgent = req.get('user-agent') || null;
            await writeJsonArray(ONBOARDING_PATH, onboardingRecords);

            const confirmationMailOptions = {
                from: MAIL_FROM,
                replyTo: record.email,
                to: ADMIN_EMAIL,
                subject: `TIS NDA confirmed by ${record.name}`,
                text: `TIS NDA confirmed
Name: ${record.name}
Company: ${record.companyName}
Title: ${record.signerTitle}
Email: ${record.email}
Confirmed at: ${record.confirmedAt}
Confirmation IP: ${record.confirmedIp || 'Not recorded'}
User agent: ${record.confirmedUserAgent || 'Not recorded'}`,
                html: buildInternalConfirmationHtml(record)
            };

            try {
                await transporter.sendMail(confirmationMailOptions);
                console.log(`Onboarding NDA confirmed by ${record.email}`);
            } catch (error) {
                console.error('Error sending onboarding confirmation email:', error.message);
            }
        } else {
            console.log(`Onboarding NDA confirmation link revisited by ${record.email}`);
        }

        return res.send(`
            <!doctype html>
            <html lang="en">
                <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <title>NDA Confirmation</title>
                    <style>
                        body { font-family: Arial, sans-serif; max-width: 720px; margin: 4rem auto; padding: 0 1rem; line-height: 1.6; }
                    </style>
                </head>
                <body>
                    <h1>NDA confirmed</h1>
                    <p>Thank you, ${escapeHtml(record.name)}. Your NDA confirmation for ${escapeHtml(record.companyName)} has been recorded.</p>
                    <p>Tom Emme will follow up with next onboarding steps.</p>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Error confirming onboarding:', error);
        return res.status(500).send('<h1>Server error</h1><p>Unable to confirm this onboarding agreement.</p>');
    }
});

// Serve index.html for the root URL
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'index.html');
    console.log(`Attempting to serve index.html from ${filePath}`);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`Error serving index.html: ${err.message}`);
            res.status(500).send('Server error: Unable to load landing page');
        } else {
            console.log('Successfully served index.html');
        }
    });
});

// Handle other routes by serving the appropriate HTML file or falling back to index.html
app.get('*', (req, res) => {
    const requestedPath = path.join(__dirname, 'public', `${req.path}.html`);
    console.log(`Attempting to serve ${requestedPath}`);
    res.sendFile(requestedPath, (err) => {
        if (err) {
            console.log(`File not found, falling back to index.html`);
            res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
                if (err) {
                    console.error(`Error serving fallback index.html: ${err.message}`);
                    res.status(500).send('Server error: Unable to load page');
                } else {
                    console.log('Successfully served index.html as fallback');
                }
            });
        }
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
