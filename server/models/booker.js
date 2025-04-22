const mongoose = require('mongoose');

const bookerSchema = new mongoose.Schema({
  bookingID: { type: mongoose.Types.ObjectId, ref: "Booking", required: true },
  userId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
 


});

// Check if the model already exists before defining it
module.exports = mongoose.models.Tenant || mongoose.model("Booker", bookerSchema);