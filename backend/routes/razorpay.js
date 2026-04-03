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
    
    // Validate key format
    if (!process.env.RAZORPAY_KEY_ID.startsWith('rzp_')) {
      throw new Error('RAZORPAY_KEY_ID must start with "rzp_"');
    }
    
    try {
      razorpayInstance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID.trim(),
        key_secret: process.env.RAZORPAY_KEY_SECRET.trim()
      });
      console.log('✅ Razorpay initialized successfully');
    } catch (err) {
      console.error('❌ Failed to initialize Razorpay:', err.message);
      throw err;
    }
  }
  return razorpayInstance;
}

// GET /api/razorpay/key — return public key to frontend
router.get('/key', auth, (req, res) => {
  try {
    const key = process.env.RAZORPAY_KEY_ID;
    if (!key) {
      return res.status(400).json({ error: 'Razorpay not configured. Contact support.' });
    }
    if (!key.trim().startsWith('rzp_')) {
      return res.status(400).json({ error: 'Invalid Razorpay key format. Contact support.' });
    }
    res.json({ key: key.trim() });
  } catch (error) {
    console.error('Razorpay key retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve Razorpay configuration' });
  }
});

// POST /api/razorpay/create-order — create Razorpay order
router.post('/create-order', auth, async (req, res) => {
  try {
    const { billId, amount } = req.body;
    
    if (!billId || !amount) {
      return res.status(400).json({ error: 'billId and amount are required' });
    }
    
    const bill = await Bill.findById(billId);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    // If customer, verify ownership
    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({ email: req.user.email });
      if (!customer || bill.customerId.toString() !== customer._id.toString()) {
        return res.status(403).json({ error: 'Not authorized to pay this bill' });
      }
    }

    if (amount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });
    if (amount > bill.balanceDue) return res.status(400).json({ error: `Amount exceeds balance due (₹${bill.balanceDue.toFixed(2)})` });

    // Validate Razorpay configuration before proceeding
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ 
        error: 'Razorpay is not configured. Please contact support.',
        debug: 'Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET'
      });
    }

    const razorpay = getRazorpay();

    console.log('Creating Razorpay order for bill:', bill.billNumber, 'Amount:', amount);

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

    console.log('✅ Razorpay order created:', order.id);

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
    console.error('❌ Razorpay create-order error:', error);
    
    // Provide meaningful error messages
    if (error.statusCode === 401 || error.message?.includes('Authentication')) {
      res.status(500).json({ 
        error: 'Razorpay authentication failed. Please check your API keys.',
        debug: error.message
      });
    } else if (error.statusCode === 429) {
      res.status(429).json({ error: 'Too many requests to Razorpay. Please try again in a moment.' });
    } else {
      res.status(500).json({ error: error.message || 'Failed to create Razorpay order' });
    }
  }
});

// POST /api/razorpay/verify-payment — verify signature & record payment
router.post('/verify-payment', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, billId, amount, notes } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !billId) {
      return res.status(400).json({ error: 'Missing required payment verification fields' });
    }

    // 1. Verify signature
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_secret) {
      return res.status(500).json({ error: 'Razorpay not configured properly' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', key_secret.trim())
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature mismatch - expected:', expectedSignature, 'got:', razorpay_signature);
      return res.status(400).json({ error: 'Payment verification failed — invalid signature' });
    }

    console.log('✅ Signature verified for payment:', razorpay_payment_id);

    // 2. Fetch payment details from Razorpay for method info
    const razorpay = getRazorpay();
    let rpPayment;
    try {
      rpPayment = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (e) {
      console.error('Failed to fetch Razorpay payment details:', e.message);
      // Continue even if fetch fails - we have the signature verification
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
    bill.balanceDue -= Number(amount);
    if (bill.balanceDue <= 0) {
      bill.status = 'paid';
      bill.paidDate = new Date();
    } else if (bill.paidAmount > 0) {
      bill.status = 'partial';
    }
    await bill.save();

    // 5. Update customer outstanding
    const customer = await Customer.findById(bill.customerId);
    if (customer) {
      customer.outstandingBalance -= Number(amount);
      await customer.save();
    }

    // 6. Send confirmation email
    const emailResult = await sendPaymentConfirmationEmail(payment, bill);

    console.log('✅ Payment verified and recorded:', payment.paymentId);

    res.json({
      success: true,
      payment: payment.toObject(),
      emailSent: emailResult.sent,
      message: `Payment of ₹${Number(amount).toLocaleString()} verified and recorded successfully!`
    });
  } catch (error) {
    console.error('❌ Razorpay verify-payment error:', error);
    res.status(500).json({ error: error.message || 'Payment verification failed' });
  }
});

// NEW: Test Razorpay configuration
router.get('/test', auth, async (req, res) => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    
    if (!keyId || !keySecret) {
      return res.json({ 
        status: 'error',
        message: 'Razorpay keys not configured',
        keyIdPresent: !!keyId,
        keySecretPresent: !!keySecret
      });
    }

    if (!keyId.startsWith('rzp_')) {
      return res.json({ 
        status: 'error',
        message: 'Invalid RAZORPAY_KEY_ID format (must start with rzp_)',
        providedFormat: keyId.substring(0, 10) + '...'
      });
    }

    const razorpay = getRazorpay();
    
    // Try to fetch account details (this authenticates the credentials)
    try {
      const account = await razorpay.customers.all({ count: 1 });
      res.json({ 
        status: 'success',
        message: 'Razorpay credentials are valid!',
        keyIdFormat: keyId.substring(0, 15) + '...'
      });
    } catch (err) {
      if (err.statusCode === 401) {
        res.json({ 
          status: 'error',
          message: 'Razorpay authentication failed - Invalid API keys',
          details: 'Check your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env'
        });
      } else {
        res.json({ 
          status: 'error',
          message: 'Razorpay test failed',
          error: err.message
        });
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
