const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: { type: String, enum: ['admin', 'customer'], required: true },
  senderName: { type: String, default: '' },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: { type: String, default: '' },
  attachment: {
    name: String,
    type: String,
    size: Number,
    url: String     // path to uploaded file or base64 data URL
  },
  timestamp: { type: Date, default: Date.now }
});

const TicketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  subject: { type: String, required: true },
  description: { type: String, default: '' },
  category: {
    type: String,
    enum: ['invoicing', 'payment', 'plan', 'technical', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'closed'],
    default: 'pending'
  },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customerName: { type: String, default: '' },
  customerEmail: { type: String, default: '' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  messages: [MessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

TicketSchema.statics.generateTicketId = async function () {
  const count = await this.countDocuments();
  return 'TKT' + (count + 1).toString().padStart(5, '0');
};

TicketSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Ticket', TicketSchema);
