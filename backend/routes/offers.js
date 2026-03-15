const router = require('express').Router();
const Offer = require('../models/Offer');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/offers
router.get('/', auth, async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.json(offers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/offers
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const offer = new Offer(req.body);
    await offer.save();
    res.status(201).json(offer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/offers/:id
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    res.json(offer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/offers/:id
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await Offer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Offer deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
