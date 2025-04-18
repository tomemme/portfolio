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

// Serve landing.html for the root URL
app.get('/', (req, res) => {
    console.log('Serving landing.html for root URL');
    res.sendFile(path.join(__dirname, 'public', 'landing.html'), (err) => {
        if (err) {
            console.error('Error serving landing.html:', err);
            res.status(500).send('Server error');
        }
    });
});

// Serve index.html for the portfolio route
app.get('/portfolio', (req, res) => {
    console.log('Serving index.html for /portfolio');
    res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
        if (err) {
            console.error('Error serving index.html:', err);
            res.status(404).send('Portfolio not found');
        }
    });
});

// Handle other routes by serving the appropriate HTML file or falling back to landing.html
app.get('*', (req, res) => {
    console.log(`Attempting to serve ${req.path}.html`);
    const requestedPath = `${req.path}.html`;
    res.sendFile(path.join(__dirname, 'public', requestedPath), (err) => {
        if (err) {
            console.log('Falling back to landing.html');
            res.sendFile(path.join(__dirname, 'public', 'landing.html'), (err) => {
                if (err) {
                    console.error('Error serving fallback landing.html:', err);
                    res.status(500).send('Server error');
                }
            });
        }
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});