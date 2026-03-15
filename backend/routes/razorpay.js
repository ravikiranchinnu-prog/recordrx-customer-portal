const router = require('express').Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const { auth } = require('../middleware/auth');
const { sendPaymentConfirmationEmail } = require('../utils/emailHelper');

// Initialize Razorpay (lazy — only when keys are set)
let razorpayInstance = null;
function getRazorpay() {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay keys not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env');
    }
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
  return razorpayInstance;
}

// GET /api/razorpay/key — return public key to frontend
router.get('/key', auth, (req, res) => {
  const key = process.env.RAZORPAY_KEY_ID;
  if (!key) return res.status(500).json({ error: 'Razorpay not configured' });
  res.json({ key });
});

// POST /api/razorpay/create-order — create Razorpay order
router.post('/create-order', auth, async (req, res) => {
  try {
    const { billId, amount } = req.body;
    const bill = await Bill.findById(billId);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    // If customer, verify ownership
    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({ email: req.user.email });
      if (!customer || bill.customerId.toString() !== customer._id.toString()) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    if (amount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });
    if (amount > bill.balanceDue) return res.status(400).json({ error: `Amount exceeds balance due (₹${bill.balanceDue.toFixed(2)})` });

    const razorpay = getRazorpay();

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency: 'INR',
      receipt: bill.billNumber || bill._id.toString(),
      notes: {
        billId: bill._id.toString(),
        invoiceNumber: bill.invoiceNumber,
        customerName: bill.customerName
      }
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      billId: bill._id,
      invoiceNumber: bill.invoiceNumber,
      customerName: bill.customerName,
      customerEmail: bill.customerEmail
    });
  } catch (error) {
    console.error('Razorpay create-order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/razorpay/verify-payment — verify signature & record payment
router.post('/verify-payment', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, billId, amount, notes } = req.body;

    // 1. Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed — invalid signature' });
    }

    // 2. Fetch payment details from Razorpay for method info
    const razorpay = getRazorpay();
    let rpPayment;
    try {
      rpPayment = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (e) {
      console.error('Failed to fetch Razorpay payment details:', e.message);
    }

    // Map Razorpay method to our enum
    const methodMap = {
      card: rpPayment?.card?.type === 'credit' ? 'credit_card' : 'debit_card',
      upi: 'upi',
      netbanking: 'online',
      wallet: 'online',
      bank_transfer: 'bank_transfer',
      emi: 'credit_card'
    };
    const paymentMethod = methodMap[rpPayment?.method] || 'online';

    // 3. Record payment in our DB
    const bill = await Bill.findById(billId);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    const paymentId = await Payment.generatePaymentId();
    const payment = new Payment({
      paymentId,
      billId: bill._id,
      customerId: bill.customerId,
      billNumber: bill.billNumber,
      customerName: bill.customerName,
      amount: Number(amount),
      paymentMethod,
      transactionId: razorpay_payment_id,
      referenceNumber: razorpay_order_id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      bankName: rpPayment?.bank || rpPayment?.wallet || '',
      status: 'completed',
      reconciliationStatus: 'matched', // auto-matched since verified by Razorpay
      notes: notes || `Paid via Razorpay (${rpPayment?.method || 'online'})`
    });
    await payment.save();

    // 4. Update bill
    bill.paidAmount += Number(amount);
    await bill.save();

    // 5. Update customer outstanding
    const customer = await Customer.findById(bill.customerId);
    if (customer) {
      customer.outstandingBalance -= Number(amount);
      await customer.save();
    }

    // 6. Send confirmation email
    const emailResult = await sendPaymentConfirmationEmail(payment, bill);

    res.json({
      success: true,
      payment: payment.toObject(),
      emailSent: emailResult.sent,
      message: `Payment of ₹${Number(amount).toLocaleString()} verified and recorded successfully!`
    });
  } catch (error) {
    console.error('Razorpay verify-payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
