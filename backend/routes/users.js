const router = require('express').Router();
const User = require('../models/User');
const Customer = require('../models/Customer');
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
    const { name, email, password, phone, company, plan, planType, offer, status } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    // Generate a unique customerId across both User and Customer collections
    const userCount = await User.countDocuments({ role: 'customer' });
    const custCount = await Customer.countDocuments();
    const nextNum = Math.max(userCount, custCount) + 1;
    const customerId = 'CUST' + nextNum.toString().padStart(5, '0');

    const user = new User({
      name, email, password: password || 'Tester@1', role: 'customer',
      phone, company, plan, planType, offer, customerId, status: status || 'active'
    });
    await user.save();

    // Also create a corresponding billing Customer record
    const billingCustomer = new Customer({
      customerId,
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      billingCycle: planType === 'yearly' ? 'yearly' : 'monthly',
      subscriptionPlan: 'basic',
      subscriptionAmount: 0,
      status: status || 'active'
    });
    await billingCustomer.save();

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
