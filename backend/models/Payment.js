const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true },
  billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  billNumber: String,
  customerName: String,
  amount: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'upi', 'credit_card', 'debit_card', 'cheque', 'online', 'other'],
    required: true
  },
  paymentDate: { type: Date, default: Date.now },
  transactionId: String,
  referenceNumber: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  bankName: String,
  chequeNumber: String,
  chequeDate: Date,
  reconciliationStatus: {
    type: String,
    enum: ['pending', 'matched', 'unmatched', 'disputed', 'resolved'],
    default: 'pending'
  },
  reconciliationDate: Date,
  reconciledBy: String,
  reconciliationNotes: String,
  bankStatementRef: String,
  bankStatementDate: Date,
  bankStatementAmount: Number,
  amountDifference: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'completed'
  },
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

PaymentSchema.statics.generatePaymentId = async function () {
  const d = new Date();
  const prefix = `PAY${d.getFullYear().toString().slice(-2)}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
  const last = await this.findOne({ paymentId: new RegExp(`^${prefix}`) }).sort({ paymentId: -1 });
  let seq = 1;
  if (last) seq = parseInt(last.paymentId.slice(-4)) + 1;
  return `${prefix}${seq.toString().padStart(4, '0')}`;
};

PaymentSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.bankStatementAmount) this.amountDifference = this.bankStatementAmount - this.amount;
  next();
});

module.exports = mongoose.model('Payment', PaymentSchema);
