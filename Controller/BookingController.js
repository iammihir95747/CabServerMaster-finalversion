// bookingController.js
require('dotenv').config();
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.createBooking = async (req, res) => {
  const {
    name,
    phoneNumber,
    pickupLocation,
    dropLocation,
    pickupDateTime,
    vehicleType,
    notes
  } = req.body;

  try {
    // Send booking info to customer via WhatsApp
    const message = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${phoneNumber}`, // make sure phone is in international format
      body: `✅ Booking Confirmed!\n\n🚖 *Booking Details*:\nName: ${name}\nPickup: ${pickupLocation}\nDrop: ${dropLocation}\nTime: ${pickupDateTime}\nVehicle: ${vehicleType}\n\nThank you for choosing our cab service!`
    });

    // Auto reply will come from webhook (see next step)
    console.log("WhatsApp message sent:", message.sid);

    res.status(200).json({ success: true, message: 'Booking created and WhatsApp message sent.' });
  } catch (error) {
    console.error("WhatsApp error:", error.message);
    res.status(500).json({ success: false, error: 'Failed to send WhatsApp message.' });
  }
};
