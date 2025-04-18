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
            // File doesn't exist yet, start with empty array
        }

        submissions.push(submission);
        await fs.writeFile(path.join(__dirname, 'submissions.json'), JSON.stringify(submissions, null, 2));

        // Trigger n8n webhook
        await fetch(process.env.N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submission)
        });

        res.json({ message: 'Message sent successfully! You’ll hear from us soon.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Serve landing.html for the root url
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', landing.html));
});

// serve index as the portfolio route
app.get('/portfolio', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle all routes by serving the appropriate HTML file or falling back to index.html
app.get('*', (req, res) => {
    const requestedPath = `${req.path}.html`;
    res.sendFile(path.join(__dirname, 'public', requestedPath), (err) => {
        if (err) {
            // If the requested HTML file doesn't exist, fall back to index.html
            res.sendFile(path.join(__dirname, 'public', 'landing.html'));
        }
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});