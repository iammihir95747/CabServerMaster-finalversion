const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;
const twilio = require('twilio');
require('dotenv').config();
const vehicleController = require('./Controller/vehicleController');
const app = express();
const PORT = process.env.PORT || 5001;

// Twilio client setup
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

app.use(cors()); // Allow cross-origin requests if needed
app.use(express.json()); // Parse JSON request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/vehicles', vehicleController.getVehicles);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Booking Schema (Updated to include driverPhoneNumber)
const bookingSchema = new mongoose.Schema({
  name: String,
  phoneNumber: String,
  pickupLocation: String,
  dropLocation: String,
  pickupDateTime: String,
  vehicleType: String,
  notes: String,
  status: { type: String, default: 'Pending' },
  createdAt: { type: Date, default: Date.now },
  driverPhoneNumber: String // Added to store the driver's phone number
});

const Booking = mongoose.model("Booking", bookingSchema);

// API to send booking
app.post('/api/send-booking', async (req, res) => {
  const { name, phoneNumber, pickupLocation, dropLocation, vehicleType, pickupDateTime, notes } = req.body;
  const driverPhoneNumber = '+919054891423'; // Example driver number (you can dynamically assign this)

  try {
    // Save booking to MongoDB with driverPhoneNumber
    const booking = new Booking({
      name,
      phoneNumber,
      pickupLocation,
      dropLocation,
      pickupDateTime,
      vehicleType,
      notes,
      driverPhoneNumber // Saving the driver's phone number
    });

    await booking.save();

    // Send WhatsApp message to the driver with the booking details
    const message = await client.messages.create({
      from: 'whatsapp:+14155238886', // Replace with your actual Twilio WhatsApp number
      to: `whatsapp:${driverPhoneNumber}`, // Driver's phone number
      body: `New Booking!\n\nUser: ${name}\nPhone: ${phoneNumber}\nPickup: ${pickupLocation}\nDrop: ${dropLocation}\nTime: ${pickupDateTime}\nVehicle: ${vehicleType}\nNotes: ${notes}`
    });

    console.log('Booking sent to driver:', message);

    res.status(200).json({ success: true, booking, message: 'WhatsApp sent to driver!' });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook to handle incoming responses from the driver
// Webhook to handle incoming responses from the driver
app.post('/webhook/incoming', async (req, res) => {
  const twiml = new MessagingResponse();
  const messageText = req.body.Body?.toLowerCase() || ''; // Get the message from WhatsApp
  const driverPhoneNumber = req.body.From.replace('whatsapp:', ''); // Get the driver's phone number (sender)

  // Find the latest pending booking for this driver
  const booking = await Booking.findOne({ driverPhoneNumber, status: 'Pending' }).sort({ createdAt: -1 });

  if (!booking) {
    twiml.message("❌ No pending booking found for this driver.");
    return res.type('text/xml').send(twiml.toString());
  }

  if (messageText.includes('accept')) {
    booking.status = 'Accepted';
    await booking.save();

    // Log the user's phone number for debugging
    console.log("User's phone number:", booking.phoneNumber); 

    try {
      // Notify user with WhatsApp
      const userMessage = await client.messages.create({
        from: 'whatsapp:+14155238886', // Twilio WhatsApp number
        to: `whatsapp:${booking.phoneNumber}`, // User's phone number
        body: `✅ Your booking has been accepted!\nPickup: ${booking.pickupLocation}\nDrop: ${booking.dropLocation}\nTime: ${booking.pickupDateTime}\nVehicle: ${booking.vehicleType}\nNotes: ${booking.notes || 'None'}`
      });
      
      // Log the Twilio API response for the user message
      console.log('User message sent:', userMessage);

      // Acknowledge to driver and instruct to contact the user
      const driverMessage = await client.messages.create({
        from: 'whatsapp:+14155238886', // Twilio WhatsApp number
        to: `whatsapp:${driverPhoneNumber}`, // Driver's phone number
        body: `✅ You have accepted the booking. Please contact the user at ${booking.phoneNumber} to confirm the pickup details and proceed with the ride.`
      });

      // Log the Twilio API response for the driver message
      console.log('Driver message sent:', driverMessage);

      twiml.message("🚖 Your booking is confirmed! The driver will contact you shortly.");
    } catch (error) {
      console.error('Error sending messages:', error);
      twiml.message("❌ There was an issue sending the message. Please try again later.");
    }
  } else {
    twiml.message("🙏 Sorry, we didn't understand. Reply with 'accept' to confirm booking.");
  }

  res.type('text/xml').send(twiml.toString());
});


// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
