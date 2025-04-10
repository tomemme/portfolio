const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const router = express.Router();

// Middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

// Test route
router.get('/test', (req, res) => {
  console.log('Reached /badideas/test route');
  res.send('Badideas test route working!');
});

// Set up SQLite database
const db = new sqlite3.Database(':memory:', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to in-memory SQLite database');
  }
});

db.serialize(() => {
  db.run("CREATE TABLE messages (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)", (err) => {
    if (err) {
      console.error('Error creating table:', err.message);
    } else {
      console.log('Messages table created');
    }
  });
});

// Endpoint to submit messages
router.post('/submit', (req, res) => {
  console.log('Reached /badideas/submit route');
  const { content } = req.body;
  db.run("INSERT INTO messages (content) VALUES (?)", [content], function (err) {
    if (err) {
      console.error('Error inserting message:', err.message);
      return res.status(500).send("Error inserting message");
    }
    setTimeout(() => {
      db.run("DELETE FROM messages WHERE id = ?", [this.lastID], (err) => {
        if (err) {
          console.error('Error deleting message:', err.message);
        }
      });
    }, 5000); // Delete after 5 seconds
    res.status(200).send("Message received and will be deleted in 5 seconds");
  });
});

// Endpoint to get the latest message
router.get('/latest-message', (req, res) => {
  console.log('Reached /badideas/latest-message route');
  db.get("SELECT id, content FROM messages ORDER BY timestamp DESC LIMIT 1", [], (err, row) => {
    if (err) {
      console.error('Error retrieving message:', err.message);
      return res.status(500).json({ error: "Error retrieving message" });
    }
    console.log('Retrieved row:', row);
    res.json(row);
  });
});

console.log('Routes registered on badideas router:', router.stack.map(layer => layer.route?.path));

module.exports = router;