const router = require('express').Router();
const Ticket = require('../models/Ticket');
const { auth } = require('../middleware/auth');
const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

const getFromAddress = () => {
  return `${process.env.EMAIL_FROM_NAME || 'RECORDRx'} <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`;
};

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

    // Send email notification
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      try {
        const isCustomerMessage = sender === 'customer';
        const recipientEmail = isCustomerMessage ? process.env.ADMIN_EMAIL : ticket.customerEmail;
        const recipientName = isCustomerMessage ? 'Admin' : ticket.customerName;
        
        if (recipientEmail) {
          const transporter = createTransporter();
          const messageHtml = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f1f5f9;">
              <div style="max-width:600px;margin:30px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
                
                <!-- Header -->
                <div style="background:linear-gradient(135deg,#0d9488,#14b8a6);padding:20px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:1px;">RECORDRx</h1>
                  <p style="color:#ccfbf1;margin:5px 0 0;font-size:12px;">FUTURE OF PATIENT CARE - POWERED BY AI</p>
                </div>

                <!-- Content -->
                <div style="padding:25px 30px;">
                  <p style="color:#334155;font-size:15px;">Hello <strong>${recipientName}</strong>,</p>
                  
                  <div style="background:#f0fdfa;border-left:4px solid #0d9488;padding:15px;margin:15px 0;border-radius:4px;">
                    <p style="color:#0d9488;margin:0;font-size:13px;font-weight:600;">New Message in Ticket ${ticket.ticketId}</p>
                    <p style="color:#64748b;margin:8px 0 0;font-size:13px;"><strong>Subject:</strong> ${ticket.subject}</p>
                  </div>

                  <div style="background:#f8fafc;padding:15px;border-radius:8px;margin:15px 0;">
                    <p style="color:#64748b;font-size:13px;margin:0 0 8px;"><strong>From:</strong> ${sender === 'admin' ? 'RECORDRx' : message.senderName}</p>
                    <div style="color:#334155;font-size:14px;line-height:1.6;white-space:pre-wrap;word-wrap:break-word;">
                      ${message.text}
                    </div>
                    ${message.timestamp ? `<p style="color:#94a3b8;font-size:12px;margin:8px 0 0;">Sent: ${new Date(message.timestamp).toLocaleString()}</p>` : ''}
                  </div>

                  <div style="border-top:1px solid #e2e8f0;padding-top:15px;margin-top:15px;">
                    <p style="color:#64748b;font-size:13px;line-height:1.6;">
                      Reply to this message by visiting your ticket or logging in to your account.
                    </p>
                  </div>

                  <div style="margin-top:20px;padding-top:15px;border-top:1px solid #e2e8f0;">
                    <p style="color:#94a3b8;font-size:11px;margin:0;text-align:center;">This is an automated message. Please do not reply to this email.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;

          await transporter.sendMail({
            from: getFromAddress(),
            to: recipientEmail,
            subject: `New message in ticket ${ticket.ticketId}: ${ticket.subject}`,
            html: messageHtml
          });

          console.log(`✉️ Ticket message email sent to ${recipientEmail}`);
        }
      } catch (emailErr) {
        console.error('❌ Failed to send ticket message email:', emailErr.message);
        // Don't fail the API request if email fails
      }
    }

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
