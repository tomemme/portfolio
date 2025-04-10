const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Import the badideas sub-app
const badideasRoutes = require('./badideas');

// Serve portfolio static files
app.use(express.static(path.join(__dirname, 'public')));

// Test route at root level
app.get('/test-root', (req, res) => {
  res.send('Root test route working!');
});

// Mount badideas at /badideas
app.use('/badideas', badideasRoutes);

// Fallback route for debugging
app.use((req, res) => {
  res.status(404).send('Route not found');
});

app.listen(port, () => console.log(`Server running on port ${port}`));