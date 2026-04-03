const mongoose = require('mongoose');

const InvoicingConfigSchema = new mongoose.Schema({
  companyName: { type: String, default: 'RECORDRx' },
  companyTagline: { type: String, default: 'FUTURE OF PATIENT CARE - POWERED BY AI' },
  companyAddress: { type: String, default: '' },
  companyGstin: { type: String, default: '' },
  companyPhone: { type: String, default: '' },
  companyEmail: { type: String, default: '' },
  bankName: { type: String, default: '' },
  bankAccountNumber: { type: String, default: '' },
  bankIfscCode: { type: String, default: '' },
  bankBranch: { type: String, default: '' },
  invoicePrefix: { type: String, default: 'INV' },
  termsAndConditions: { type: String, default: '' },
  notes: { type: String, default: '' },
  billingModel: { type: String, enum: ['prepaid', 'postpaid'], default: 'prepaid' },
  billGenDay: { type: Number, default: 1 },
  billDueDay: { type: Number, default: 5 },
  graceDay: { type: Number, default: 7 },
  taxRate: { type: Number, default: 18 },
  updatedAt: { type: Date, default: Date.now }
});

InvoicingConfigSchema.pre('save', function (next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.model('InvoicingConfig', InvoicingConfigSchema);
