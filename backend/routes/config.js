const router = require('express').Router();
const InvoicingConfig = require('../models/InvoicingConfig');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/config/invoicing
router.get('/invoicing', auth, adminOnly, async (req, res) => {
  try {
    let config = await InvoicingConfig.findOne();
    if (!config) {
      config = await InvoicingConfig.create({});
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/config/invoicing
router.put('/invoicing', auth, adminOnly, async (req, res) => {
  try {
    let config = await InvoicingConfig.findOne();
    if (!config) config = new InvoicingConfig();
    Object.assign(config, req.body);
    await config.save();
    res.json(config);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
