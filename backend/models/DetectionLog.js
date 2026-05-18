const mongoose = require('mongoose');

const detectionLogSchema = new mongoose.Schema(
  {
    place: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Place',
      required: true,
      index: true,
    },
    detectedCount: { type: Number, required: true },
    occupancyPercentage: { type: Number, required: true },
    status: { type: String, enum: ['free', 'busy', 'full'], required: true },
    mediaType: { type: String },
    mediaUrl: { type: String },
    rawDetections: { type: mongoose.Schema.Types.Mixed }, // YOLO raw output
    confidence: { type: Number }, // average confidence score
    processingTimeMs: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DetectionLog', detectionLogSchema);
