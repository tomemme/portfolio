const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();

// Middleware to parse JSON bodies for form submissions
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

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

        // Trigger n8n webhook
        const webhookUrl = process.env.N8N_WEBHOOK_URL;
        if (webhookUrl) {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submission)
            });
            console.log('Webhook triggered:', webhookUrl);
        } else {
            console.log('N8N_WEBHOOK_URL not set, skipping webhook');
        }

        res.json({ message: 'Message sent successfully! You will hear from us soon.' });
    } catch (error) {
        console.error('Error processing submission:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Serve index.html (formerly landing.html) for the root URL
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

// Serve home.html (formerly index.html) for the portfolio route
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