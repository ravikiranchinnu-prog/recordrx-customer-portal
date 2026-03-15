require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const Customer = require('../src/models/Customer');
const Bill = require('../src/models/Bill');
const Payment = require('../src/models/Payment');
const emailService = require('./services/emailService');
const emailConfig = require('./config/email.config');

const app = express();
const PORT = process.env.PORT || 5000;

// Email transporter for custom ticket templates
const createDraftTransporter = () => {
  return nodemailer.createTransport({
    host: emailConfig.EMAIL_HOST,
    port: emailConfig.EMAIL_PORT,
    secure: emailConfig.EMAIL_SECURE,
    auth: {
      user: emailConfig.EMAIL_USER,
      pass: emailConfig.EMAIL_PASSWORD
    }
  });
};

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/recordrx';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ==================== CUSTOMER ROUTES ====================

// Get all customers
app.get('/api/customers', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { customerId: new RegExp(search, 'i') }
      ];
    }
    
    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    
    const total = await Customer.countDocuments(query);
    
    res.json({ customers, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create customer
app.post('/api/customers', async (req, res) => {
  try {
    const count = await Customer.countDocuments();
    const customerId = `CUST${(count + 1).toString().padStart(5, '0')}`;
    
    const customer = new Customer({
      ...req.body,
      customerId
    });
    
    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get customer by ID
app.get('/api/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update customer
app.put('/api/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== BILL ROUTES ====================

// Get all bills
app.get('/api/bills', async (req, res) => {
  try {
    const { status, customerId, startDate, endDate, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (customerId) query.customerId = customerId;
    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) query.issueDate.$gte = new Date(startDate);
      if (endDate) query.issueDate.$lte = new Date(endDate);
    }
    
    const bills = await Bill.find(query)
      .populate('customerId', 'name email customerId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    
    const total = await Bill.countDocuments(query);
    
    // Calculate summary
    const allBills = await Bill.find(query);
    const summary = {
      totalAmount: allBills.reduce((sum, b) => sum + b.totalAmount, 0),
      paidAmount: allBills.reduce((sum, b) => sum + b.paidAmount, 0),
      pendingAmount: allBills.reduce((sum, b) => sum + b.balanceDue, 0),
      overdueCount: allBills.filter(b => b.status === 'overdue').length
    };
    
    res.json({ bills, total, page: Number(page), pages: Math.ceil(total / limit), summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-generate bill for a customer
app.post('/api/bills/generate', async (req, res) => {
  try {
    const { customerId, items, billingPeriodStart, billingPeriodEnd, dueDate, notes } = req.body;
    
    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    
    const billNumber = await Bill.generateBillNumber();
    const invoiceNumber = await Bill.generateInvoiceNumber();
    
    // Calculate amounts
    let subtotal = 0;
    let totalTax = 0;
    
    const billItems = items.map(item => {
      const amount = item.quantity * item.unitPrice;
      const taxAmount = (amount * (item.taxRate || 18)) / 100;
      subtotal += amount;
      totalTax += taxAmount;
      
      return {
        ...item,
        amount,
        taxAmount
      };
    });
    
    const totalAmount = subtotal + totalTax;
    
    const bill = new Bill({
      billNumber,
      invoiceNumber,
      customerId: customer._id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerAddress: `${customer.address?.street || ''}, ${customer.address?.city || ''}, ${customer.address?.state || ''} - ${customer.address?.zipCode || ''}`,
      customerGstin: customer.gstin,
      billingPeriodStart: new Date(billingPeriodStart),
      billingPeriodEnd: new Date(billingPeriodEnd),
      items: billItems,
      subtotal,
      taxAmount: totalTax,
      totalAmount,
      balanceDue: totalAmount,
      dueDate: new Date(dueDate),
      notes,
      isAutoGenerated: true
    });
    
    await bill.save();
    
    // Update customer's last bill date
    customer.lastBillDate = new Date();
    customer.outstandingBalance += totalAmount;
    await customer.save();
    
    res.status(201).json(bill);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get bill by ID
app.get('/api/bills/:id', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('customerId');
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download invoice as PDF
app.get('/api/bills/:id/invoice', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${bill.invoiceNumber.replace(/\//g, '-')}.pdf`);
    
    doc.pipe(res);
    
    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('Record Rx', 50, 50);
    doc.fontSize(10).font('Helvetica').text('Billing & Payment Management', 50, 78);
    
    // Invoice title
    doc.fontSize(20).font('Helvetica-Bold').text('INVOICE', 450, 50, { align: 'right' });
    doc.fontSize(10).font('Helvetica').text(`#${bill.invoiceNumber}`, 450, 75, { align: 'right' });
    
    // Line
    doc.moveTo(50, 100).lineTo(550, 100).stroke();
    
    // Bill details
    doc.fontSize(10).font('Helvetica-Bold').text('Bill To:', 50, 120);
    doc.font('Helvetica').text(bill.customerName, 50, 135);
    doc.text(bill.customerAddress || '', 50, 150);
    doc.text(`Email: ${bill.customerEmail}`, 50, 180);
    doc.text(`Phone: ${bill.customerPhone}`, 50, 195);
    if (bill.customerGstin) doc.text(`GSTIN: ${bill.customerGstin}`, 50, 210);
    
    // Invoice details (right side)
    doc.font('Helvetica-Bold').text('Invoice Details:', 350, 120);
    doc.font('Helvetica')
      .text(`Bill Number: ${bill.billNumber}`, 350, 135)
      .text(`Issue Date: ${bill.issueDate.toLocaleDateString('en-IN')}`, 350, 150)
      .text(`Due Date: ${bill.dueDate.toLocaleDateString('en-IN')}`, 350, 165)
      .text(`Status: ${bill.status.toUpperCase()}`, 350, 180);
    
    // Billing period
    doc.text(`Period: ${bill.billingPeriodStart.toLocaleDateString('en-IN')} - ${bill.billingPeriodEnd.toLocaleDateString('en-IN')}`, 350, 195);
    
    // Items table header
    const tableTop = 250;
    doc.font('Helvetica-Bold');
    doc.text('Description', 50, tableTop);
    doc.text('Qty', 280, tableTop);
    doc.text('Unit Price', 330, tableTop);
    doc.text('Tax', 420, tableTop);
    doc.text('Amount', 480, tableTop, { align: 'right' });
    
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    // Items
    let y = tableTop + 25;
    doc.font('Helvetica');
    for (const item of bill.items) {
      doc.text(item.description, 50, y, { width: 220 });
      doc.text(item.quantity.toString(), 280, y);
      doc.text(`₹${item.unitPrice.toFixed(2)}`, 330, y);
      doc.text(`${item.taxRate}%`, 420, y);
      doc.text(`₹${(item.amount + item.taxAmount).toFixed(2)}`, 480, y, { align: 'right' });
      y += 20;
    }
    
    // Totals
    y += 20;
    doc.moveTo(350, y).lineTo(550, y).stroke();
    y += 10;
    
    doc.text('Subtotal:', 350, y);
    doc.text(`₹${bill.subtotal.toFixed(2)}`, 480, y, { align: 'right' });
    y += 18;
    
    doc.text('Tax (GST):', 350, y);
    doc.text(`₹${bill.taxAmount.toFixed(2)}`, 480, y, { align: 'right' });
    y += 18;
    
    if (bill.discount > 0) {
      doc.text('Discount:', 350, y);
      doc.text(`-₹${bill.discount.toFixed(2)}`, 480, y, { align: 'right' });
      y += 18;
    }
    
    doc.moveTo(350, y).lineTo(550, y).stroke();
    y += 10;
    
    doc.font('Helvetica-Bold');
    doc.text('Total:', 350, y);
    doc.text(`₹${bill.totalAmount.toFixed(2)}`, 480, y, { align: 'right' });
    y += 18;
    
    if (bill.paidAmount > 0) {
      doc.font('Helvetica').text('Paid:', 350, y);
      doc.text(`₹${bill.paidAmount.toFixed(2)}`, 480, y, { align: 'right' });
      y += 18;
    }
    
    doc.font('Helvetica-Bold');
    doc.text('Balance Due:', 350, y);
    doc.text(`₹${bill.balanceDue.toFixed(2)}`, 480, y, { align: 'right' });
    
    // Footer
    y = 700;
    doc.font('Helvetica').fontSize(9);
    doc.text('Thank you for your business!', 50, y, { align: 'center' });
    doc.text('Record Rx - Billing & Payment Management', 50, y + 15, { align: 'center' });
    
    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PAYMENT ROUTES ====================

// Get all payments
app.get('/api/payments', async (req, res) => {
  try {
    const { status, reconciliationStatus, startDate, endDate, page = 1, limit = 20 } = req.query;
    const query = {};
    
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
    
    // Reconciliation summary
    const allPayments = await Payment.find(query);
    const reconciliationSummary = {
      total: allPayments.length,
      pending: allPayments.filter(p => p.reconciliationStatus === 'pending').length,
      matched: allPayments.filter(p => p.reconciliationStatus === 'matched').length,
      unmatched: allPayments.filter(p => p.reconciliationStatus === 'unmatched').length,
      disputed: allPayments.filter(p => p.reconciliationStatus === 'disputed').length,
      totalAmount: allPayments.reduce((sum, p) => sum + p.amount, 0)
    };
    
    res.json({ payments, total, page: Number(page), pages: Math.ceil(total / limit), reconciliationSummary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record a payment
app.post('/api/payments', async (req, res) => {
  try {
    const { billId, amount, paymentMethod, transactionId, referenceNumber, notes } = req.body;
    
    const bill = await Bill.findById(billId);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    
    const paymentId = await Payment.generatePaymentId();
    
    const payment = new Payment({
      paymentId,
      billId: bill._id,
      customerId: bill.customerId,
      billNumber: bill.billNumber,
      customerName: bill.customerName,
      amount,
      paymentMethod,
      transactionId,
      referenceNumber,
      notes
    });
    
    await payment.save();
    
    // Update bill
    bill.paidAmount += amount;
    await bill.save();
    
    // Update customer outstanding balance
    const customer = await Customer.findById(bill.customerId);
    if (customer) {
      customer.outstandingBalance -= amount;
      await customer.save();
    }
    
    res.status(201).json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Reconcile payment
app.put('/api/payments/:id/reconcile', async (req, res) => {
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

// ==================== DASHBOARD STATS ====================

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Revenue chart: last 6 months of paid invoice amounts
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const revenueByMonth = await Payment.aggregate([
      { $match: { paymentDate: { $gte: sixMonthsAgo }, status: 'completed' } },
      { $group: { _id: { y: { $year: '$paymentDate' }, m: { $month: '$paymentDate' } }, total: { $sum: '$amount' } } },
      { $sort: { '_id.y': 1, '_id.m': 1 } }
    ]);
    // Build a 6-month array with labels
    const revenueChart = [];
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear(), m = d.getMonth() + 1;
      const found = revenueByMonth.find(r => r._id.y === y && r._id.m === m);
      revenueChart.push({ label: monthNames[m - 1], value: found ? found.total : 0 });
    }

    const [
      totalCustomers,
      activeCustomers,
      totalBills,
      allBills,
      openTickets,
      totalTickets,
      pendingTickets,
      inProgressTickets,
      closedTickets,
      totalUsers,
      monthlyRevenue,
      monthlyPayments,
      monthlyPlanCount,
      yearlyPlanCount,
      totalPaidAmount
    ] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({ status: 'active' }),
      Bill.countDocuments(),
      Bill.find({}),
      require('./models/Ticket') ? require('./models/Ticket').countDocuments({ status: { $in: ['open','in-progress'] } }).catch(() => 0) : Promise.resolve(0),
      require('./models/Ticket') ? require('./models/Ticket').countDocuments().catch(() => 0) : Promise.resolve(0),
      require('./models/Ticket') ? require('./models/Ticket').countDocuments({ status: 'open' }).catch(() => 0) : Promise.resolve(0),
      require('./models/Ticket') ? require('./models/Ticket').countDocuments({ status: 'in-progress' }).catch(() => 0) : Promise.resolve(0),
      require('./models/Ticket') ? require('./models/Ticket').countDocuments({ status: { $in: ['resolved','closed'] } }).catch(() => 0) : Promise.resolve(0),
      require('./models/User') ? require('./models/User').countDocuments().catch(() => 0) : Promise.resolve(0),
      Bill.aggregate([
        { $match: { issueDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Payment.aggregate([
        { $match: { paymentDate: { $gte: startOfMonth }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Customer.countDocuments({ billingCycle: 'monthly' }),
      Customer.countDocuments({ billingCycle: 'yearly' }),
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const pendingBills = allBills.filter(b => ['pending','partial'].includes(b.status));
    const overdueBills = allBills.filter(b => b.status === 'overdue');
    const paidBills = allBills.filter(b => b.status === 'paid');
    const totalInvoicedAmount = allBills.reduce((s, b) => s + (b.totalAmount || 0), 0);
    const totalCollected = totalPaidAmount[0]?.total || 0;
    const collectionRate = totalInvoicedAmount > 0 ? Math.round((totalCollected / totalInvoicedAmount) * 100) : 0;

    // Donut chart data
    const donutData = {
      paid: paidBills.length,
      pending: pendingBills.length,
      overdue: overdueBills.length,
      total: allBills.length
    };

    res.json({
      totalCustomers,
      activeCustomers,
      totalBills,
      pendingAmount: pendingBills.reduce((sum, b) => sum + (b.balanceDue || 0), 0),
      overdueAmount: overdueBills.reduce((sum, b) => sum + (b.balanceDue || 0), 0),
      overdueCount: overdueBills.length,
      pendingCount: pendingBills.length,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      monthlyCollections: monthlyPayments[0]?.total || 0,
      totalRevenue: totalCollected,
      totalOutstanding: totalInvoicedAmount - totalCollected,
      // Charts
      revenueChart,
      donutData,
      // Quick insights
      collectionRate,
      monthlyPlanCount,
      yearlyPlanCount,
      // Tickets
      openTickets,
      totalTickets,
      pendingTickets,
      inProgressTickets,
      closedTickets,
      // Users
      totalUsers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== EMAIL ROUTES ====================

// Test email configuration
app.get('/api/email/test-connection', async (req, res) => {
  try {
    const result = await emailService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send test email
app.post('/api/email/send-test', async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }
    
    const result = await emailService.sendEmail(to, 'welcome', {
      customerName: 'Test User',
      customerId: 'TEST001',
      planName: 'Test Plan',
      planAmount: '1000'
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send invoice email
app.post('/api/email/send-invoice', async (req, res) => {
  try {
    const { to, invoiceData } = req.body;
    if (!to || !invoiceData) {
      return res.status(400).json({ error: 'Recipient email and invoice data are required' });
    }
    
    const result = await emailService.sendInvoice(to, invoiceData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send payment confirmation
app.post('/api/email/send-payment-confirmation', async (req, res) => {
  try {
    const { to, paymentData } = req.body;
    if (!to || !paymentData) {
      return res.status(400).json({ error: 'Recipient email and payment data are required' });
    }
    
    const result = await emailService.sendPaymentConfirmation(to, paymentData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send payment reminder
app.post('/api/email/send-reminder', async (req, res) => {
  try {
    const { to, reminderData } = req.body;
    if (!to || !reminderData) {
      return res.status(400).json({ error: 'Recipient email and reminder data are required' });
    }
    
    const result = await emailService.sendPaymentReminder(to, reminderData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current email configuration (without sensitive data)
app.get('/api/email/config', (req, res) => {
  res.json({
    host: emailConfig.EMAIL_HOST,
    port: emailConfig.EMAIL_PORT,
    secure: emailConfig.EMAIL_SECURE,
    fromName: emailConfig.EMAIL_FROM_NAME,
    fromAddress: emailConfig.EMAIL_FROM_ADDRESS,
    settings: {
      sendInvoiceOnGeneration: emailConfig.SEND_INVOICE_ON_GENERATION,
      sendPaymentConfirmation: emailConfig.SEND_PAYMENT_CONFIRMATION,
      sendReminderBeforeDue: emailConfig.SEND_REMINDER_BEFORE_DUE,
      reminderDaysBeforeDue: emailConfig.REMINDER_DAYS_BEFORE_DUE
    }
  });
});

// Get predefined email drafts for ticket responses
app.get('/api/email/drafts', (req, res) => {
  try {
    const file = path.join(__dirname, 'config', 'emailDrafts.json');
    if (!fs.existsSync(file)) return res.json([]);
    const raw = fs.readFileSync(file, 'utf8');
    const drafts = JSON.parse(raw || '[]');
    res.json(
      drafts.map(d => ({
        id: d.id,
        subject: d.subject,
        issueType: d.issueType,
        customerQuestions: d.customerQuestions || '',
        html: d.html || ''
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send a selected email draft to a customer
app.post('/api/email/send-draft', async (req, res) => {
  try {
    const { draftId, to, templateData } = req.body;
    if (!draftId || !to) {
      return res.status(400).json({ error: 'draftId and recipient email are required' });
    }

    const file = path.join(__dirname, 'config', 'emailDrafts.json');
    if (!fs.existsSync(file)) {
      return res.status(404).json({ error: 'Drafts configuration not found' });
    }

    const drafts = JSON.parse(fs.readFileSync(file, 'utf8') || '[]');
    const draft = drafts.find(d => d.id === draftId);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    const data = templateData || {};
    const tpl = (str = '') =>
      str.replace(/\{\{\s*(.*?)\s*\}\}/g, (_, key) => (data[key] != null ? String(data[key]) : ''));

    const transporter = createDraftTransporter();
    await transporter.sendMail({
      from: `${emailConfig.EMAIL_FROM_NAME} <${emailConfig.EMAIL_FROM_ADDRESS}>`,
      to: Array.isArray(to) ? to.join(',') : to,
      subject: tpl(draft.subject),
      html: tpl(draft.html || '')
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send welcome email to new customer/user
app.post('/api/email/welcome', async (req, res) => {
  try {
    const { to, name, password, type } = req.body;
    if (!to || !name) {
      return res.status(400).json({ error: 'Recipient email and name are required' });
    }
    
    const result = await emailService.sendWelcome(to, { name, password, type });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== RENEWAL REMINDER SCHEDULER ====================

/**
 * POST /api/email/renewal-reminders
 * Triggers renewal reminder emails for customers approaching plan expiry.
 * 
 * Should be called by an external cron/scheduler:
 * - Every day for monthly plan reminders
 * - Every Monday for yearly plan reminders (or daily; server will filter)
 * 
 * Body: { customers: [...], billingConfig: {...} }
 *   customers: array of { email, name, plan, planType, planStartDate, status }
 *   billingConfig: { billGenDay, billDueDay }
 */
app.post('/api/email/renewal-reminders', async (req, res) => {
  try {
    const { customers = [] } = req.body;
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
    const dayOfMonth = today.getDate();
    const results = [];

    for (const c of customers) {
      if (c.status !== 'active' || !c.email) continue;

      const startDate = c.planStartDate ? new Date(c.planStartDate) : new Date();
      const expiryDate = new Date(startDate);
      if (c.planType === 'yearly') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      } else {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      }

      const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      let shouldSend = false;

      if (c.planType === 'monthly') {
        // Monthly: send daily from the 25th or when <=5 days remaining
        if (dayOfMonth >= 25 || diffDays <= 5) {
          shouldSend = true; // daily
        }
      } else if (c.planType === 'yearly') {
        // Yearly: send weekly (only on Mondays) when <=60 days remaining
        if (diffDays <= 60 && dayOfWeek === 1) {
          shouldSend = true; // weekly on Monday
        }
      }

      if (shouldSend && diffDays > 0) {
        const result = await emailService.sendRenewalReminder(c.email, {
          customerName: c.name,
          planName: c.plan,
          planType: c.planType === 'monthly' ? 'Monthly' : 'Yearly',
          expiryDate: expiryDate.toISOString().split('T')[0],
          daysRemaining: diffDays,
          amount: c.planAmount || 0
        });
        results.push({ email: c.email, sent: result.success });
      }
    }

    res.json({ success: true, processed: customers.length, sent: results.filter(r => r.sent).length, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Radix API server running on port ${PORT}`);
});
