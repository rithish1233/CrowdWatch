const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Place = require('../models/Place');
const DetectionLog = require('../models/DetectionLog');
const { authenticate, managerOnly } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const { uploadToSupabase } = require('../services/supabaseService');
const { analyzeWithYOLO, analyzeWebcam } = require('../services/yoloService');

// Track active live streams per place: placeId -> intervalId
const activeStreams = new Map();

// POST /api/media/upload/:placeId
router.post(
  '/upload/:placeId',
  authenticate,
  managerOnly,
  upload.single('media'),
  handleUploadError,
  async (req, res) => {
    const start = Date.now();
    try {
      const place = await Place.findById(req.params.placeId);
      if (!place) return res.status(404).json({ message: 'Place not found.' });
      if (place.manager.toString() !== req.user._id.toString())
        return res.status(403).json({ message: 'Not your place.' });
      if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

      const file = req.file;
      const isImage = file.mimetype.startsWith('image/');
      const ext = file.originalname.split('.').pop();
      const fileName = `${place._id}/${uuidv4()}.${ext}`;

      const { url, path: storagePath } = await uploadToSupabase(file.buffer, fileName, file.mimetype);
      const yoloResult = await analyzeWithYOLO(url, isImage ? 'image' : 'video');
      const detectedCount = yoloResult.person_count || 0;

      place.computeStatus(detectedCount);
      place.mediaType = isImage ? 'image' : 'video';
      place.mediaUrl = url;
      place.storagePath = storagePath;
      await place.save();

      await DetectionLog.create({
        place: place._id,
        detectedCount,
        occupancyPercentage: place.occupancyPercentage,
        status: place.status,
        mediaType: place.mediaType,
        mediaUrl: url,
        rawDetections: yoloResult.detections || [],
        confidence: yoloResult.avg_confidence || null,
        processingTimeMs: Date.now() - start,
      });

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
        mediaUrl: url,
        lastAnalyzedAt: place.lastAnalyzedAt,
      });

      res.json({
        message: 'Media uploaded and analyzed',
        mediaUrl: url,
        detectedCount,
        occupancyPercentage: place.occupancyPercentage,
        status: place.status,
        statusColor: place.statusColor,
        processingTimeMs: Date.now() - start,
      });
    } catch (err) {
      console.error('Media upload error:', err);
      res.status(500).json({ message: err.message || 'Upload/analysis failed.' });
    }
  }
);

// POST /api/media/stream/:placeId
router.post('/stream/:placeId', authenticate, managerOnly, async (req, res) => {
  try {
    const { streamUrl, mediaType } = req.body;
    if (!streamUrl) return res.status(400).json({ message: 'streamUrl required.' });

    const place = await Place.findById(req.params.placeId);
    if (!place) return res.status(404).json({ message: 'Place not found.' });
    if (place.manager.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not your place.' });

    place.streamUrl = streamUrl;
    place.mediaType = mediaType || 'ip_stream';
    await place.save();

    const yoloResult = await analyzeWithYOLO(streamUrl, 'stream');
    const detectedCount = yoloResult.person_count || 0;
    place.computeStatus(detectedCount);
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
      message: 'Stream configured and analyzed',
      status: place.status,
      detectedCount,
      occupancyPercentage: place.occupancyPercentage,
    });
  } catch (err) {
    console.error('Stream error:', err);
    res.status(500).json({ message: err.message || 'Stream analysis failed.' });
  }
});

// POST /api/media/webcam/:placeId/start — Start live webcam streaming (every 3 seconds)
router.post('/webcam/:placeId/start', authenticate, managerOnly, async (req, res) => {
  const { placeId } = req.params;
  const { cameraIndex = 0 } = req.body;

  // Stop any existing stream for this place first
  if (activeStreams.has(placeId)) {
    clearInterval(activeStreams.get(placeId));
    activeStreams.delete(placeId);
  }

  const place = await Place.findById(placeId);
  if (!place) return res.status(404).json({ message: 'Place not found.' });
  if (place.manager.toString() !== req.user._id.toString())
    return res.status(403).json({ message: 'Not your place.' });

  const io = req.app.get('io');

  // Broadcast that streaming has started
  io.emit('place:streaming', { placeId, streaming: true });

  // Run YOLO every 3 seconds
  const intervalId = setInterval(async () => {
    try {
      const freshPlace = await Place.findById(placeId);
      if (!freshPlace) {
        clearInterval(intervalId);
        activeStreams.delete(placeId);
        return;
      }

      const yoloResult = await analyzeWebcam(cameraIndex);
      const detectedCount = yoloResult.person_count || 0;

      freshPlace.computeStatus(detectedCount);
      freshPlace.mediaType = 'webcam';
      await freshPlace.save();

      await DetectionLog.create({
        place: freshPlace._id,
        detectedCount,
        occupancyPercentage: freshPlace.occupancyPercentage,
        status: freshPlace.status,
        mediaType: 'webcam',
        processingTimeMs: 0,
      });

      io.emit('place:update', {
        placeId: freshPlace._id,
        name: freshPlace.name,
        status: freshPlace.status,
        statusColor: freshPlace.statusColor,
        currentOccupancy: freshPlace.currentOccupancy,
        occupancyPercentage: freshPlace.occupancyPercentage,
        capacity: freshPlace.capacity,
        seats: freshPlace.seats,
        lastAnalyzedAt: freshPlace.lastAnalyzedAt,
      });

      console.log(`[LiveStream] Place ${placeId}: ${detectedCount} people, ${freshPlace.status}`);
    } catch (err) {
      console.error('[LiveStream] Error:', err.message);
    }
  }, 3000); // every 3 seconds

  activeStreams.set(placeId, intervalId);
  console.log(`[LiveStream] Started for place ${placeId}`);

  res.json({ message: 'Live webcam stream started', placeId, intervalMs: 3000 });
});

// POST /api/media/webcam/:placeId/stop — Stop live webcam streaming
router.post('/webcam/:placeId/stop', authenticate, managerOnly, async (req, res) => {
  const { placeId } = req.params;

  if (activeStreams.has(placeId)) {
    clearInterval(activeStreams.get(placeId));
    activeStreams.delete(placeId);
    console.log(`[LiveStream] Stopped for place ${placeId}`);

    const io = req.app.get('io');
    io.emit('place:streaming', { placeId, streaming: false });

    res.json({ message: 'Live stream stopped', placeId });
  } else {
    res.json({ message: 'No active stream for this place', placeId });
  }
});

// GET /api/media/webcam/active — which places are currently streaming
router.get('/webcam/active', authenticate, managerOnly, async (req, res) => {
  res.json({ activePlaces: Array.from(activeStreams.keys()) });
});

// GET /api/media/logs/:placeId
router.get('/logs/:placeId', authenticate, managerOnly, async (req, res) => {
  try {
    const logs = await DetectionLog.find({ place: req.params.placeId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch logs.' });
  }
});

module.exports = router;
