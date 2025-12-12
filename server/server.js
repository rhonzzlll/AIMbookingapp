const express = require('express');
const rateLimit = require('express-rate-limit');
const mailer = require('./mailer'); // your mailer.js

const app = express();

// Example: Apply limiter to all routes except /api/send-email
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => req.path === '/api/send-email', // <-- skip limiter for email route
});
app.use(limiter);

// Your email route
app.post('/api/send-email', async (req, res) => {
  // ...use mailer to send email...
});

app.listen(5000, () => console.log('Server running'));




