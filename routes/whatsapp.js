// routes/whatsapp.js
const express = require('express');
const router = express.Router();

router.post('/incoming', (req, res) => {
  const twiml = new MessagingResponse();
  const received = req.body.Body.toLowerCase();

  let reply = "🙏 Thank you for contacting our cab service!";

  if (received.includes("book")) {
    reply = "📝 Please send your booking details:\n1. Pickup Location\n2. Drop Location\n3. Date & Time\n4. Vehicle Type";
  }

  res.set('Content-Type', 'text/xml');
  res.send(`<Response><Message>${reply}</Message></Response>`);
});

module.exports = router;
