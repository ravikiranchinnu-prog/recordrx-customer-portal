const router = require('express').Router();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { auth, adminOnly } = require('../middleware/auth');

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

// GET /api/email/test-connection
router.get('/test-connection', auth, adminOnly, async (req, res) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    res.json({ success: true, message: 'Email connection verified' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/email/send-test
router.post('/send-test', auth, adminOnly, async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'Recipient email required' });
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `${process.env.EMAIL_FROM_NAME || 'Radix'} <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
      to,
      subject: 'Test Email from Radix',
      html: '<h1>Test Email</h1><p>This is a test email from Radix Billing System.</p>'
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/email/send-invoice
router.post('/send-invoice', auth, adminOnly, async (req, res) => {
  try {
    const { to, invoiceData } = req.body;
    if (!to || !invoiceData) return res.status(400).json({ error: 'Recipient and invoice data required' });
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `${process.env.EMAIL_FROM_NAME || 'Radix'} <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
      to,
      subject: `Invoice ${invoiceData.invoiceNumber} from Radix`,
      html: `<h2>Invoice ${invoiceData.invoiceNumber}</h2><p>Dear ${invoiceData.customerName},</p><p>Amount Due: ₹${invoiceData.amount}</p><p>Due Date: ${invoiceData.dueDate}</p>`
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/email/config
router.get('/config', auth, adminOnly, (req, res) => {
  res.json({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    fromName: process.env.EMAIL_FROM_NAME || 'Radix Billing',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || ''
  });
});

// GET /api/email/drafts
// Public read access for drafts (keeps send protected). This allows the frontend
// to load available templates without requiring a token during local testing.
router.get('/drafts', (req, res) => {
  try {
    const file = path.join(__dirname, '..', 'config', 'emailDrafts.json');
    if (!fs.existsSync(file)) return res.json([]);
    const raw = fs.readFileSync(file, 'utf8');
    const drafts = JSON.parse(raw || '[]');
    res.json(drafts.map(d => ({ id: d.id, subject: d.subject })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/email/send-draft
router.post('/send-draft', auth, adminOnly, async (req, res) => {
  try {
    const { draftId, to, templateData } = req.body;
    if (!draftId || !to) return res.status(400).json({ error: 'draftId and to required' });
    const file = path.join(__dirname, '..', 'config', 'emailDrafts.json');
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'Drafts not found' });
    const drafts = JSON.parse(fs.readFileSync(file, 'utf8') || '[]');
    const draft = drafts.find(d => d.id === draftId);
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    const tpl = (str = '') => str.replace(/\{\{\s*(.*?)\s*\}\}/g, (_, k) => (templateData && templateData[k] ? templateData[k] : ''));

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `${process.env.EMAIL_FROM_NAME || 'Radix'} <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(',') : to,
      subject: tpl(draft.subject),
      html: tpl(draft.html || '')
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
