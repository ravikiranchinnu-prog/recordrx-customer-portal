const mongoose = require('mongoose');

const NotificationReadSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  key: { type: String, required: true },
  readAt: { type: Date, default: Date.now }
});

NotificationReadSchema.index({ userId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('NotificationRead', NotificationReadSchema);
