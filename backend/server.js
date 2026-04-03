require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/offers', require('./routes/offers'));
app.use('/api/config', require('./routes/config'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/email', require('./routes/email'));
app.use('/api/razorpay', require('./routes/razorpay'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 RECORDRx API server running on port ${PORT}`);
});

// ── Cron: Auto-generate prepaid bills on the 1st of every month at 00:05 ──
cron.schedule('5 0 1 * *', async () => {
  console.log('🔄 Running monthly prepaid bill generation...');
  try {
    const Customer = require('./models/Customer');
    const Bill = require('./models/Bill');
    const Plan = require('./models/Plan');
    const Offer = require('./models/Offer');
    const InvoicingConfig = require('./models/InvoicingConfig');
    const { sendInvoiceEmail } = require('./utils/emailHelper');

    const config = await InvoicingConfig.findOne() || {};
    const dueDay = config.billDueDay || 5;
    const graceDay = config.graceDay || 7;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Billing period is for the current month (prepaid)
    const billingPeriodStart = new Date(year, month, 1);
    const billingPeriodEnd = new Date(year, month + 1, 0); // last day of month
    const dueDate = new Date(year, month, dueDay);
    const graceDate = new Date(year, month, graceDay);

    const activeCustomers = await Customer.find({
      status: 'active',
      subscriptionAmount: { $gt: 0 },
      billingCycle: 'monthly'
    }).populate('plan').populate('offer');

    for (const customer of activeCustomers) {
      // Check if bill already generated for this month
      const existingBill = await Bill.findOne({
        customerId: customer._id,
        billingPeriodStart: { $gte: billingPeriodStart },
        billingPeriodEnd: { $lte: new Date(year, month + 1, 0, 23, 59, 59) }
      });
      if (existingBill) continue;

      let amount = customer.subscriptionAmount;
      const planDoc = customer.plan;
      const taxRate = planDoc?.gst || config.taxRate || 18;

      // Check if offer is active for this month
      let discount = 0;
      let discountDesc = '';
      if (customer.offer && customer.offerMonths > 0 && customer.offerStartDate) {
        const offerStart = new Date(customer.offerStartDate);
        const monthsUsed = customer.offerMonthsUsed || 0;
        if (now >= offerStart && monthsUsed < customer.offerMonths) {
          const offerDoc = customer.offer;
          if (offerDoc.discountPercent > 0) {
            discount = (amount * offerDoc.discountPercent) / 100;
            discountDesc = `${offerDoc.name} (${offerDoc.discountPercent}% off)`;
          } else if (offerDoc.discountAmount > 0) {
            discount = offerDoc.discountAmount;
            discountDesc = `${offerDoc.name} (₹${offerDoc.discountAmount} off)`;
          }
          // Increment offerMonthsUsed
          customer.offerMonthsUsed = monthsUsed + 1;
        }
      }

      const discountedAmount = Math.max(amount - discount, 0);
      const taxAmount = (discountedAmount * taxRate) / 100;
      const totalAmount = discountedAmount + taxAmount;

      const billNumber = await Bill.generateBillNumber();
      const invoiceNumber = await Bill.generateInvoiceNumber();

      const items = [{
        description: `${planDoc?.name || customer.subscriptionPlan || 'Subscription'} Plan - ${now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`,
        quantity: 1, unitPrice: amount, amount: discountedAmount, taxRate, taxAmount
      }];

      const bill = new Bill({
        billNumber, invoiceNumber,
        customerId: customer._id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        customerAddress: customer.address || '',
        customerGstin: customer.gstin,
        billingPeriodStart, billingPeriodEnd,
        billingType: 'prepaid',
        items,
        subtotal: discountedAmount, taxAmount,
        discount, discountType: discount > 0 ? 'fixed' : 'fixed',
        totalAmount, balanceDue: totalAmount,
        dueDate, graceDate,
        notes: discountDesc ? `Auto-generated prepaid invoice. Offer applied: ${discountDesc}` : 'Auto-generated prepaid invoice',
        isAutoGenerated: true
      });
      await bill.save();

      customer.lastBillDate = new Date();
      customer.outstandingBalance += totalAmount;
      await customer.save();

      // Send invoice email (non-blocking)
      sendInvoiceEmail(bill).catch(err => console.error('Email failed for', customer.email, err.message));
    }
    console.log(`✅ Generated bills for ${activeCustomers.length} customers`);
  } catch (err) {
    console.error('❌ Cron bill generation error:', err.message);
  }
});

// ── Cron: Mark overdue bills daily at 00:30 (after grace period expires) ──
cron.schedule('30 0 * * *', async () => {
  try {
    const Bill = require('./models/Bill');
    const now = new Date();
    // Mark bills as overdue if grace date has passed and still unpaid
    const result = await Bill.updateMany(
      { status: { $in: ['pending', 'partial'] }, graceDate: { $lt: now } },
      { $set: { status: 'overdue' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`⚠️ Marked ${result.modifiedCount} bills as overdue`);
    }
  } catch (err) {
    console.error('❌ Cron overdue check error:', err.message);
  }
});

// ── Cron: Send monthly report on the 2nd of every month at 08:00 ──
cron.schedule('0 8 2 * *', async () => {
  console.log('Generating monthly report...');
  try {
    const { generateAndSendMonthlyReport } = require('./utils/reportHelper');
    const now = new Date();
    // Report for previous month
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const result = await generateAndSendMonthlyReport(prevYear, prevMonth);
    if (result.sent) {
      console.log(`✅ Monthly report sent to: ${result.recipients.join(', ')}`);
    } else {
      console.log(`⚠️ Monthly report not sent: ${result.reason}`);
    }
  } catch (err) {
    console.error('❌ Cron monthly report error:', err.message);
  }
});
