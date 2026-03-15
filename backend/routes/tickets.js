const router = require('express').Router();
const Ticket = require('../models/Ticket');
const { auth } = require('../middleware/auth');

// GET /api/tickets
router.get('/', auth, async (req, res) => {
  try {
    const { status, priority, category, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    // Customers only see their own tickets
    if (req.user.role === 'customer') {
      query.customerId = req.user._id;
    }
    if (search) {
      query.$or = [
        { ticketId: new RegExp(search, 'i') },
        { subject: new RegExp(search, 'i') },
        { customerName: new RegExp(search, 'i') }
      ];
    }
    const tickets = await Ticket.find(query).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tickets
router.post('/', auth, async (req, res) => {
  try {
    const { subject, description, category, priority } = req.body;
    const ticketId = await Ticket.generateTicketId();
    const ticket = new Ticket({
      ticketId, subject, description,
      category: category || 'other',
      priority: priority || 'medium',
      customerId: req.user._id,
      customerName: req.user.name,
      customerEmail: req.user.email
    });
    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/tickets/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: req.params.id });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    // Customers can only see own tickets
    if (req.user.role === 'customer' && ticket.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tickets/:id/status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await Ticket.findOne({ ticketId: req.params.id });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    ticket.status = status;
    await ticket.save();
    res.json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/tickets/:id/messages - send a chat message
router.post('/:id/messages', auth, async (req, res) => {
  try {
    const { text, attachment } = req.body;
    if (!text && !attachment) return res.status(400).json({ error: 'Message text or attachment required' });

    const ticket = await Ticket.findOne({ ticketId: req.params.id });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.status === 'closed') return res.status(400).json({ error: 'Ticket is closed' });

    const sender = req.user.role === 'customer' ? 'customer' : 'admin';
    const message = {
      sender,
      senderName: req.user.name,
      senderId: req.user._id,
      text: text || '',
      timestamp: new Date()
    };
    if (attachment) {
      message.attachment = {
        name: attachment.name,
        type: attachment.type,
        size: attachment.size,
        url: attachment.url || attachment.data
      };
    }

    ticket.messages.push(message);
    await ticket.save();

    res.status(201).json(ticket.messages[ticket.messages.length - 1]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/tickets/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findOneAndDelete({ ticketId: req.params.id });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ message: 'Ticket deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
