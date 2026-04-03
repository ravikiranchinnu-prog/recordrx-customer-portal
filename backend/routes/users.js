const router = require('express').Router();
const User = require('../models/User');
const Customer = require('../models/Customer');
const Plan = require('../models/Plan');
const Offer = require('../models/Offer');
const Bill = require('../models/Bill');
const { sendWelcomeEmail } = require('../utils/emailHelper');
const { auth, adminUp } = require('../middleware/auth');

// GET /api/users - list all non-customer users
router.get('/', auth, adminUp, async (req, res) => {
  try {
    const { role, status, search } = req.query;
    const query = { role: { $ne: 'customer' } };
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }
    const users = await User.find(query).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users - create user
router.post('/', auth, adminUp, async (req, res) => {
  try {
    const { name, email, password, role, phone, status } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const user = new User({ name, email, password: password || 'Tester@1', role: role || 'viewer', phone, status });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/users/:id - update user
router.put('/:id', auth, adminUp, async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.password; // password changed via /auth/change-password
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', auth, adminUp, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/customers - list customer-role users (mgmtCustomers)
router.get('/customers', auth, adminUp, async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = { role: 'customer' };
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { customerId: new RegExp(search, 'i') }
      ];
    }
    const customers = await User.find(query).sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/customers - create managed customer (with login)
router.post('/customers', auth, adminUp, async (req, res) => {
  try {
    const { name, email, password, phone, company, address, plan, planType, offer, offerMonths, status } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    // Generate a unique customerId across both User and Customer collections
    const userCount = await User.countDocuments({ role: 'customer' });
    const custCount = await Customer.countDocuments();
    const nextNum = Math.max(userCount, custCount) + 1;
    const customerId = 'CUST' + nextNum.toString().padStart(5, '0');

    const user = new User({
      name, email, password: password || 'Tester@1', role: 'customer',
      phone, company, address, plan, planType, offer, offerMonths: offerMonths || 0, customerId, status: status || 'active'
    });
    await user.save();

    // Look up plan details for pricing
    let planDoc = null;
    let subscriptionAmount = 0;
    if (plan) {
      planDoc = await Plan.findById(plan);
      if (planDoc) subscriptionAmount = planDoc.price || 0;
    }

    // Calculate offer dates
    const now = new Date();
    const nextMonth1st = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    let offerDoc = null;
    let offerStartDate = null;
    if (offer && offerMonths > 0) {
      offerDoc = await Offer.findById(offer);
      offerStartDate = nextMonth1st;
    }

    // Create billing Customer record
    const billingCustomer = new Customer({
      customerId,
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      address: address || '',
      plan: plan || null,
      billingCycle: planType === 'yearly' ? 'yearly' : 'monthly',
      subscriptionPlan: 'basic',
      subscriptionAmount,
      planStartDate: planDoc ? now : null,
      offer: offer || null,
      offerMonths: offerMonths || 0,
      offerStartDate,
      offerMonthsUsed: 0,
      nextBillDate: planDoc ? nextMonth1st : null,
      status: status || 'active'
    });
    await billingCustomer.save();

    // Generate prorated bill if plan is assigned and it's a monthly plan
    if (planDoc && planType !== 'yearly') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const startDay = now.getDate();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const daysRemaining = daysInMonth - startDay + 1; // include start day
      const proratedPrice = (planDoc.price / daysInMonth) * daysRemaining;
      const taxRate = planDoc.gst || 18;
      const taxAmount = (proratedPrice * taxRate) / 100;
      const totalAmount = proratedPrice + taxAmount;

      const billingPeriodStart = new Date(year, month, startDay);
      const billingPeriodEnd = new Date(year, month + 1, 0); // last day of month
      const dueDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // +5 days
      const graceDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days

      const billNumber = await Bill.generateBillNumber();
      const invoiceNumber = await Bill.generateInvoiceNumber();

      const bill = new Bill({
        billNumber, invoiceNumber,
        customerId: billingCustomer._id,
        customerName: name,
        customerEmail: email.toLowerCase(),
        customerPhone: phone || '',
        customerAddress: address || '',
        billingPeriodStart, billingPeriodEnd,
        billingType: 'prepaid',
        items: [{
          description: `${planDoc.name} Plan - Prorated (${daysRemaining}/${daysInMonth} days)`,
          quantity: 1, unitPrice: proratedPrice, amount: proratedPrice, taxRate, taxAmount
        }],
        subtotal: proratedPrice, taxAmount, totalAmount, balanceDue: totalAmount,
        dueDate, graceDate,
        notes: 'Prorated bill for partial month',
        isAutoGenerated: true
      });
      await bill.save();

      billingCustomer.lastBillDate = now;
      billingCustomer.outstandingBalance += totalAmount;
      await billingCustomer.save();
    }

    // For yearly plans, generate full year bill immediately
    if (planDoc && planType === 'yearly') {
      const year = now.getFullYear();
      const taxRate = planDoc.gst || 18;
      const taxAmount = (planDoc.price * taxRate) / 100;
      const totalAmount = planDoc.price + taxAmount;

      const billingPeriodStart = now;
      const billingPeriodEnd = new Date(year + 1, now.getMonth(), now.getDate());
      const dueDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      const graceDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const billNumber = await Bill.generateBillNumber();
      const invoiceNumber = await Bill.generateInvoiceNumber();

      const bill = new Bill({
        billNumber, invoiceNumber,
        customerId: billingCustomer._id,
        customerName: name,
        customerEmail: email.toLowerCase(),
        customerPhone: phone || '',
        customerAddress: address || '',
        billingPeriodStart, billingPeriodEnd,
        billingType: 'prepaid',
        items: [{
          description: `${planDoc.name} Plan - Yearly`,
          quantity: 1, unitPrice: planDoc.price, amount: planDoc.price, taxRate, taxAmount
        }],
        subtotal: planDoc.price, taxAmount, totalAmount, balanceDue: totalAmount,
        dueDate, graceDate,
        notes: 'Yearly plan bill',
        isAutoGenerated: true
      });
      await bill.save();

      billingCustomer.lastBillDate = now;
      billingCustomer.nextBillDate = billingPeriodEnd;
      billingCustomer.outstandingBalance += totalAmount;
      await billingCustomer.save();
    }

    // Send welcome email to customer and admin
    sendWelcomeEmail({
      customerName: name,
      customerEmail: email.toLowerCase(),
      customerId,
      planName: planDoc?.name || '',
      planType: planType || 'monthly',
      planPrice: planDoc?.price || 0,
      planGst: planDoc?.gst || 18,
      offerName: offerDoc?.name || '',
      offerDiscount: offerDoc ? (offerDoc.discountPercent > 0 ? `${offerDoc.discountPercent}% off for ${offerMonths || 0} months` : `₹${offerDoc.discountAmount} off for ${offerMonths || 0} months`) : '',
      address: address || '',
      phone: phone || '',
      company: company || ''
    }).catch(err => console.error('[Email] Welcome email error:', err.message));

    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/users/customers/:id - update managed customer (syncs billing Customer)
router.put('/customers/:id', auth, adminUp, async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.password;
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Sync the billing Customer record if it exists
    if (user.customerId) {
      const syncFields = {};
      if (updates.name) syncFields.name = updates.name;
      if (updates.email) syncFields.email = updates.email.toLowerCase();
      if (updates.phone) syncFields.phone = updates.phone;
      if (updates.address !== undefined) syncFields.address = updates.address;
      if (updates.status) syncFields.status = updates.status;
      if (updates.planType) syncFields.billingCycle = updates.planType === 'yearly' ? 'yearly' : 'monthly';
      if (Object.keys(syncFields).length > 0) {
        await Customer.findOneAndUpdate({ customerId: user.customerId }, syncFields);
      }
    }

    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/users/customers/:id - delete managed customer (also removes billing Customer)
router.delete('/customers/:id', auth, adminUp, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Also remove the corresponding billing Customer
    if (user.customerId) {
      await Customer.findOneAndDelete({ customerId: user.customerId });
    }

    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
