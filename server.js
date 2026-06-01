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
const SUBMISSIONS_PATH = path.join(__dirname, 'submissions.json');
const ONBOARDING_PATH = path.join(__dirname, 'onboarding-submissions.json');
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
    <p>Hello ${escapeHtml(name)},</p>
    <p>Thank you for starting the onboarding process with Tech Integration Solutions.</p>
    <p>Please review the NDA below. If the terms are acceptable, confirm them here:</p>
    <p><a href="${escapeHtml(confirmationUrl)}">Confirm NDA terms</a></p>
    <p>Your project note:</p>
    <blockquote>${escapeHtml(message)}</blockquote>
    <hr />
    <p><strong>Customized NDA for ${escapeHtml(companyName)}</strong></p>
    <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${escapeHtml(renderedNda)}</pre>
`;

const buildInternalOnboardingHtml = ({ name, companyName, signerTitle, email, message, timestamp, confirmationUrl }) => `
    <p><strong>New TIS onboarding request</strong></p>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Company:</strong> ${escapeHtml(companyName)}</p>
    <p><strong>Title:</strong> ${escapeHtml(signerTitle)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Message:</strong> ${escapeHtml(message)}</p>
    <p><strong>Timestamp:</strong> ${escapeHtml(timestamp)}</p>
    <p><strong>Confirmation link:</strong> <a href="${escapeHtml(confirmationUrl)}">${escapeHtml(confirmationUrl)}</a></p>
`;

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
            const timestamp = new Date().toISOString();
            const renderedNda = await compileNda({ name, companyName, signerTitle });
            const token = crypto.randomBytes(32).toString('hex');
            const confirmationUrl = `${getBaseUrl(req)}/confirm-onboarding/${token}`;
            const onboardingRecord = {
                type: 'tis-onboarding',
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
                        filename: 'Tech-Integration-Solutions-NDA.md',
                        content: renderedNda
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
Timestamp: ${timestamp}
Confirmation link: ${confirmationUrl}`,
                html: buildInternalOnboardingHtml({ name, companyName, signerTitle, email, message, timestamp, confirmationUrl })
            };

            try {
                await transporter.sendMail(clientMailOptions);
                await transporter.sendMail(internalMailOptions);
                console.log(`Onboarding NDA sent to ${email}`);
            } catch (error) {
                console.error('Error sending onboarding email:', error.message);
            }

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
