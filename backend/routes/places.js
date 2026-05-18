const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Place = require('../models/Place');
const { authenticate, managerOnly } = require('../middleware/auth');

// GET /api/places  — public: all active places with live status
router.get('/', async (req, res) => {
  try {
    const places = await Place.find({ isActive: true })
      .populate('manager', 'name email')
      .select('-seats') // exclude detailed seat data from list view
      .sort({ name: 1 });
    res.json({ places });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch places.' });
  }
});

// GET /api/places/:id  — public: single place with full seat grid
router.get('/:id', async (req, res) => {
  try {
    const place = await Place.findById(req.params.id).populate(
      'manager',
      'name email'
    );
    if (!place) return res.status(404).json({ message: 'Place not found.' });
    res.json({ place });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch place.' });
  }
});

// POST /api/places  — manager only: create place
router.post(
  '/',
  authenticate,
  managerOnly,
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('capacity').isInt({ min: 1 }).withMessage('Capacity must be a positive integer'),
    body('rows').optional().isInt({ min: 1, max: 50 }),
    body('cols').optional().isInt({ min: 1, max: 50 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, location, capacity, rows, cols } = req.body;

    try {
      const place = new Place({
        name,
        description,
        location,
        capacity: parseInt(capacity),
        rows: parseInt(rows) || 5,
        cols: parseInt(cols) || 10,
        manager: req.user._id,
      });

      // Auto-generate seat grid
      place.generateSeats();
      await place.save();

      res.status(201).json({ message: 'Place created', place });
    } catch (err) {
      console.error('Create place error:', err);
      res.status(500).json({ message: 'Failed to create place.' });
    }
  }
);

// PUT /api/places/:id  — manager only: update place info
router.put('/:id', authenticate, managerOnly, async (req, res) => {
  try {
    const place = await Place.findById(req.params.id);
    if (!place) return res.status(404).json({ message: 'Place not found.' });

    // Only the owning manager can edit
    if (place.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this place.' });
    }

    const { name, description, location, capacity, streamUrl } = req.body;
    if (name) place.name = name;
    if (description !== undefined) place.description = description;
    if (location !== undefined) place.location = location;
    if (capacity) place.capacity = parseInt(capacity);
    if (streamUrl !== undefined) place.streamUrl = streamUrl;

    await place.save();
    res.json({ message: 'Place updated', place });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update place.' });
  }
});

// DELETE /api/places/:id  — manager only
router.delete('/:id', authenticate, managerOnly, async (req, res) => {
  try {
    const place = await Place.findById(req.params.id);
    if (!place) return res.status(404).json({ message: 'Place not found.' });

    if (place.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    await place.deleteOne();
    res.json({ message: 'Place permanently deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete place.' });
  }
});

// GET /api/places/manager/my  — manager: their own places
router.get('/manager/my', authenticate, managerOnly, async (req, res) => {
  try {
    const places = await Place.find({ manager: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({ places });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch your places.' });
  }
});

module.exports = router;
