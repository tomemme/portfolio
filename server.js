const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle all routes by serving the appropriate HTML file or falling back to index.html
app.get('*', (req, res) => {
  const requestedPath = req.path === '/' ? '/index.html' : `${req.path}.html`;
  res.sendFile(path.join(__dirname, 'public', requestedPath), (err) => {
    if (err) {
      // If the requested HTML file doesn't exist, fall back to index.html
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});