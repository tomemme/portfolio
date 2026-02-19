const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');
const app = express();

// Create a Nodemailer transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER, // Your Gmail address
        pass: process.env.GMAIL_APP_PASSWORD // Your Gmail App Password
    }
});

// Middleware to parse JSON bodies for form submissions
app.use(express.json());

// Serve static files from the 'public' directory with logging
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        console.log(`Serving static file: ${filePath}`);
    }
}));

// Handle contact form submissions
app.post('/submit-contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const submission = { name, email, message, timestamp: new Date().toISOString() };
        let submissions = [];
        try {
            const data = await fs.readFile(path.join(__dirname, 'submissions.json'), 'utf8');
            submissions = JSON.parse(data);
        } catch (error) {
            console.log('Submissions file not found, starting with empty array');
        }

        submissions.push(submission);
        await fs.writeFile(path.join(__dirname, 'submissions.json'), JSON.stringify(submissions, null, 2));

        // Send email via Nodemailer
        const mailOptions = {
            from: process.env.GMAIL_USER, // Your Gmail address
            to: 'tomemme@outlook.com',
            subject: `New Contact Form Submission from ${name}`,
            text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}\nTimestamp: ${submission.timestamp}`,
            html: `<p><strong>Name:</strong> ${name}</p>
                   <p><strong>Email:</strong> ${email}</p>
                   <p><strong>Message:</strong> ${message}</p>
                   <p><strong>Timestamp:</strong> ${submission.timestamp}</p>`
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`Email sent to tomemme@outlook.com from ${email}`);
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

// Serve index.html (Tech Integration Solutions) for the root URL
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

// Serve home.html (portfolio) for the portfolio route
app.get('/portfolio', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'home.html');
    console.log(`Attempting to serve home.html from ${filePath}`);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`Error serving home.html: ${err.message}`);
            res.status(404).send('Portfolio not found');
        } else {
            console.log('Successfully served home.html');
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