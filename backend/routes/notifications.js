const router = require('express').Router();
const { auth } = require('../middleware/auth');
const NotificationRead = require('../models/Notification');
const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const Ticket = require('../models/Ticket');

// GET /api/notifications — generate current notifications with read status
router.get('/', auth, async (req, res) => {
  try {
    const items = [];
    const now = new Date();

    if (req.user.role === 'customer') {
      const cust = await Customer.findOne({ email: req.user.email });
      let myBills = [];
      if (cust) myBills = await Bill.find({ customerId: cust._id });

      const overdueBills = myBills.filter(b =>
        ['pending', 'partial', 'overdue'].includes(b.status) && b.dueDate && new Date(b.dueDate) < now
      );
      const dueSoonBills = myBills.filter(b =>
        ['pending', 'partial'].includes(b.status) && b.dueDate &&
        new Date(b.dueDate) >= now &&
        (new Date(b.dueDate) - now) <= 3 * 24 * 60 * 60 * 1000
      );

      if (overdueBills.length > 0) {
        const totalDue = overdueBills.reduce((s, b) => s + (b.balanceDue || 0), 0);
        items.push({
          key: `overdue-${overdueBills.length}-${Math.round(totalDue)}`,
          icon: '⚠️',
          text: `${overdueBills.length} overdue invoice${overdueBills.length > 1 ? 's' : ''} — ₹${totalDue.toLocaleString('en-IN')}`,
          type: 'danger',
          link: '/customer/invoices'
        });
      } else if (dueSoonBills.length > 0) {
        const totalDue = dueSoonBills.reduce((s, b) => s + (b.balanceDue || 0), 0);
        items.push({
          key: `due-soon-${dueSoonBills.length}-${Math.round(totalDue)}`,
          icon: '⚠️',
          text: `${dueSoonBills.length} invoice${dueSoonBills.length > 1 ? 's' : ''} due soon — ₹${totalDue.toLocaleString('en-IN')}`,
          type: 'warning',
          link: '/customer/invoices'
        });
      }

      const myTickets = await Ticket.find({ customerId: req.user._id });
      const openTickets = myTickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length;
      if (openTickets > 0) {
        items.push({
          key: `tickets-open-${openTickets}`,
          icon: '🎫',
          text: `${openTickets} open ticket${openTickets > 1 ? 's' : ''}`,
          type: 'info',
          link: '/customer/tickets'
        });
      }
    } else {
      // Admin notifications
      const allBills = await Bill.find();
      const overdueBills = allBills.filter(b => b.status === 'overdue');
      const pendingBills = allBills.filter(b => ['pending', 'partial'].includes(b.status));
      const openTickets = await Ticket.countDocuments({ status: { $in: ['open', 'in-progress'] } });

      if (overdueBills.length > 0) {
        const overdueAmount = overdueBills.reduce((s, b) => s + (b.balanceDue || 0), 0);
        items.push({
          key: `overdue-${overdueBills.length}-${Math.round(overdueAmount)}`,
          icon: '⚠️',
          text: `${overdueBills.length} overdue invoice${overdueBills.length > 1 ? 's' : ''} — ₹${overdueAmount.toLocaleString('en-IN')}`,
          type: 'danger',
          link: '/admin/invoicing'
        });
      }
      if (pendingBills.length > 0) {
        items.push({
          key: `pending-${pendingBills.length}`,
          icon: '📄',
          text: `${pendingBills.length} pending invoice${pendingBills.length > 1 ? 's' : ''}`,
          type: 'warning',
          link: '/admin/invoicing'
        });
      }
      if (openTickets > 0) {
        items.push({
          key: `tickets-open-${openTickets}`,
          icon: '🎫',
          text: `${openTickets} open ticket${openTickets > 1 ? 's' : ''}`,
          type: 'info',
          link: '/admin/tickets'
        });
      }
    }

    // Check read status
    const readRecords = await NotificationRead.find({
      userId: req.user._id,
      key: { $in: items.map(n => n.key) }
    });
    const readKeys = new Set(readRecords.map(r => r.key));

    const result = items.map(n => ({ ...n, read: readKeys.has(n.key) }));
    const unreadCount = result.filter(n => !n.read).length;

    res.json({ notifications: result, unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/notifications/read-all — mark all current notifications as read
router.put('/read-all', auth, async (req, res) => {
  try {
    const { keys } = req.body;
    if (!keys || !Array.isArray(keys)) return res.status(400).json({ error: 'keys array required' });

    const ops = keys.map(key => ({
      updateOne: {
        filter: { userId: req.user._id, key },
        update: { $setOnInsert: { userId: req.user._id, key, readAt: new Date() } },
        upsert: true
      }
    }));
    if (ops.length > 0) await NotificationRead.bulkWrite(ops);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/notifications/:key/read — mark single notification as read
router.put('/:key/read', auth, async (req, res) => {
  try {
    await NotificationRead.findOneAndUpdate(
      { userId: req.user._id, key: req.params.key },
      { $setOnInsert: { userId: req.user._id, key: req.params.key, readAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
