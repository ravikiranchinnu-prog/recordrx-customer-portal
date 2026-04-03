const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true },
  tenantId: { type: String, default: null },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  phone: { type: String, required: true },
  address: { type: String, default: '' },
  gstin: String,

  // ── Tenant fields (synced from external app) ──
  hostName: { type: String, default: null, lowercase: true },
  currency: { type: String, default: null },
  config: { type: Object, default: null },
  logo: { type: String, default: null },
  longitude: { type: String, default: null },
  latitude: { type: String, default: null },
  digipin: { type: String, default: null },
  ownerInfo: { type: Object, default: null },
  isActive: { type: Boolean, default: true },
  workingHours: [{
    dayOfWeek: { type: String },
    isOpen: { type: Boolean, default: true },
    openTime: { type: String },
    closeTime: { type: String }
  }],
  exceptionDays: [{
    date: { type: Date },
    reason: { type: String }
  }],
  apptMinLeadTime: { type: Number, default: 0, min: 0 },
  apptMaxAdvanceWindow: { type: Number, default: 30, min: 1 },
  registrationNumber: { type: String, default: null },
  taxId: { type: String, default: null },
  website: { type: String, default: null },
  contactPerson: { type: String, default: null },
  contactEmail: { type: String, default: null, lowercase: true },
  contactPhone: { type: String, default: null },
  planType: { type: String, default: null },
  planStatus: { type: String, default: null },
  planExpiryDate: { type: Date, default: null },

  // ── Portal billing fields ──
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  subscriptionPlan: {
    type: String,
    enum: ['basic', 'standard', 'premium', 'enterprise'],
    default: 'basic'
  },
  subscriptionAmount: { type: Number, default: 0 },
  planStartDate: { type: Date, default: null },
  offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', default: null },
  offerMonths: { type: Number, default: 0 },
  offerStartDate: { type: Date, default: null },
  offerMonthsUsed: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  outstandingBalance: { type: Number, default: 0 },
  lastBillDate: Date,
  nextBillDate: Date
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    transform: function (doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

module.exports = mongoose.model('Customer', CustomerSchema);
