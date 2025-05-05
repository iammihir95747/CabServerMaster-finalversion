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

// Booking Schema
const bookingSchema = new mongoose.Schema({
  name: String,
  phoneNumber: String,
  pickupLocation: String,
  dropLocation: String,
  pickupDateTime: String,
  vehicleType: String,
  notes: String,
  status: { type: String, default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model("Booking", bookingSchema);


app.post('/api/send-booking', async (req, res) => {
  const { name, phoneNumber, pickupLocation, dropLocation, vehicleType, pickupDateTime, notes } = req.body;

 
  const driverPhoneNumber = '+919574713004'; 

  try {
    // Save booking to MongoDB
    const booking = new Booking({
      name,
      phoneNumber,
      pickupLocation,
      dropLocation,
      pickupDateTime,
      vehicleType,
      notes
    });

    await booking.save();

    // Send WhatsApp message to the driver with the booking details
    const message = await client.messages.create({
      from: 'whatsapp:+14155238886', // Your Twilio number
      to: `whatsapp:${driverPhoneNumber}`, // Driver's phone number (replace this dynamically)
      body: `New Booking!\n\nUser: ${name}\nPhone: ${phoneNumber}\nPickup: ${pickupLocation}\nDrop: ${dropLocation}\nTime: ${pickupDateTime}\nVehicle: ${vehicleType}\nNotes: ${notes}`
    });

    console.log('Booking sent to driver:', message);

    res.status(200).json({ success: true, booking, message: 'WhatsApp sent to driver!' });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/webhook/incoming', async (req, res) => {
  const twiml = new MessagingResponse();
  const messageText = req.body.Body?.toLowerCase() || ''; // Get the message from WhatsApp
  const driverPhoneNumber = req.body.From; // Get the driver's phone number (sender)
  const userPhoneNumber = req.body.To.replace('whatsapp:', ''); // Get the user's phone number (from the "To" field)

  // Find the booking for the specific user (based on phone number)
  const booking = await Booking.findOne({ phoneNumber: userPhoneNumber });

  if (!booking) {
    twiml.message("❌ No booking found for this number.");
    return res.type('text/xml').send(twiml.toString());
  }

  if (messageText.includes('accept')) {
    // Update booking status to 'Accepted' in the database
    booking.status = 'Accepted';
    await booking.save();

    // Send confirmation to the user via WhatsApp
    const messageToUser = await client.messages.create({
      from: 'whatsapp:+14155238886', // Twilio WhatsApp number
      to: `whatsapp:${booking.phoneNumber}`, // User's phone number
      body: `✅ Your booking has been accepted by the driver!\n\nPickup: ${booking.pickupLocation}\nDrop: ${booking.dropLocation}\nTime: ${booking.pickupDateTime}\nVehicle: ${booking.vehicleType}\nNotes: ${booking.notes || 'None'}\n\nYour ride is on its way! 🚖`
    });

    // Send confirmation to the driver
    const messageToDriver = await client.messages.create({
      from: 'whatsapp:+14155238886', // Twilio WhatsApp number
      to: `whatsapp:${driverPhoneNumber}`, // Driver's phone number (this comes from the incoming webhook)
      body: `✅ Booking Accepted!\n\nDriver: You have successfully accepted the booking. Please proceed to the pickup location and confirm once you have reached the passenger.`
    });

    twiml.message("🚖 Your booking has been accepted! The driver is on their way.");
  } else {
    twiml.message("🙏 Sorry, we did not understand your response. Type 'accept' to confirm.");
  }

  res.type('text/xml').send(twiml.toString());
});



// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
