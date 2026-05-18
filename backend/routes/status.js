const express = require('express');
const router = express.Router();
const Place = require('../models/Place');
const { authenticate, managerOnly } = require('../middleware/auth');

// GET /api/status  — all places live status (public)
router.get('/', async (req, res) => {
  try {
    const places = await Place.find({ isActive: true })
      .select('name location status statusColor currentOccupancy occupancyPercentage capacity lastAnalyzedAt mediaType')
      .sort({ name: 1 });

    const summary = {
      total: places.length,
      free: places.filter((p) => p.status === 'free').length,
      busy: places.filter((p) => p.status === 'busy').length,
      full: places.filter((p) => p.status === 'full').length,
    };

    res.json({ places, summary });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch status.' });
  }
});

// POST /api/status/:placeId/manual  — manager: manually override status
router.post('/:placeId/manual', authenticate, managerOnly, async (req, res) => {
  try {
    const { count } = req.body;
    if (count === undefined || isNaN(count)) {
      return res.status(400).json({ message: 'count (number) required.' });
    }

    const place = await Place.findById(req.params.placeId);
    if (!place) return res.status(404).json({ message: 'Place not found.' });

    if (place.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    place.computeStatus(parseInt(count));
    await place.save();

    const io = req.app.get('io');
    io.emit('place:update', {
      placeId: place._id,
      name: place.name,
      status: place.status,
      statusColor: place.statusColor,
      currentOccupancy: place.currentOccupancy,
      occupancyPercentage: place.occupancyPercentage,
      capacity: place.capacity,
      seats: place.seats,
      lastAnalyzedAt: place.lastAnalyzedAt,
    });

    res.json({
      message: 'Status updated manually',
      status: place.status,
      currentOccupancy: place.currentOccupancy,
      occupancyPercentage: place.occupancyPercentage,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status.' });
  }
});

module.exports = router;
