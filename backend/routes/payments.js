const router = require('express').Router();
const Payment = require('../models/Payment');
const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const { auth, adminOnly } = require('../middleware/auth');
const { sendPaymentConfirmationEmail } = require('../utils/emailHelper');

// GET /api/payments
router.get('/', auth, async (req, res) => {
  try {
    const { status, reconciliationStatus, startDate, endDate, billId, page = 1, limit = 20 } = req.query;
    const query = {};
    if (billId) query.billId = billId;
    if (status) query.status = status;
    if (reconciliationStatus) query.reconciliationStatus = reconciliationStatus;
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }
    const payments = await Payment.find(query)
      .populate('billId', 'billNumber invoiceNumber totalAmount')
      .populate('customerId', 'name customerId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Payment.countDocuments(query);
    const allPayments = await Payment.find(query);
    const reconciliationSummary = {
      total: allPayments.length,
      pending: allPayments.filter(p => p.reconciliationStatus === 'pending').length,
      matched: allPayments.filter(p => p.reconciliationStatus === 'matched').length,
      unmatched: allPayments.filter(p => p.reconciliationStatus === 'unmatched').length,
      disputed: allPayments.filter(p => p.reconciliationStatus === 'disputed').length,
      totalAmount: allPayments.reduce((s, p) => s + p.amount, 0)
    };
    res.json({ payments, total, page: Number(page), pages: Math.ceil(total / limit), reconciliationSummary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payments  (admin or customer paying own bill)
router.post('/', auth, async (req, res) => {
  try {
    const { billId, amount, paymentMethod, transactionId, referenceNumber, notes } = req.body;
    const bill = await Bill.findById(billId);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    // If customer role, verify the bill belongs to them
    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({ email: req.user.email });
      if (!customer || bill.customerId.toString() !== customer._id.toString()) {
        return res.status(403).json({ error: 'Not authorized to pay this bill' });
      }
    }

    if (amount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });
    if (amount > bill.balanceDue) return res.status(400).json({ error: `Amount exceeds balance due (₹${bill.balanceDue.toFixed(2)})` });

    const paymentId = await Payment.generatePaymentId();
    const payment = new Payment({
      paymentId, billId: bill._id, customerId: bill.customerId,
      billNumber: bill.billNumber, customerName: bill.customerName,
      amount, paymentMethod, transactionId, referenceNumber, notes
    });
    await payment.save();
    bill.paidAmount += amount;
    await bill.save();
    const customer = await Customer.findById(bill.customerId);
    if (customer) { customer.outstandingBalance -= amount; await customer.save(); }

    // Send payment confirmation email (non-blocking)
    const emailResult = await sendPaymentConfirmationEmail(payment, bill);

    res.status(201).json({ ...payment.toObject(), emailSent: emailResult.sent });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/payments/:id/reconcile
router.put('/:id/reconcile', auth, adminOnly, async (req, res) => {
  try {
    const { reconciliationStatus, reconciliationNotes, bankStatementRef, bankStatementDate, bankStatementAmount, reconciledBy } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    payment.reconciliationStatus = reconciliationStatus;
    payment.reconciliationNotes = reconciliationNotes;
    payment.reconciledBy = reconciledBy;
    payment.reconciliationDate = new Date();
    if (bankStatementRef) payment.bankStatementRef = bankStatementRef;
    if (bankStatementDate) payment.bankStatementDate = new Date(bankStatementDate);
    if (bankStatementAmount) payment.bankStatementAmount = bankStatementAmount;
    await payment.save();
    res.json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
