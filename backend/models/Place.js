const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  seatId: { type: String, required: true },
  row: { type: Number, required: true },
  col: { type: Number, required: true },
  isOccupied: { type: Boolean, default: false },
  label: { type: String, default: '' },
});

const placeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Place name is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    location: {
      type: String,
      trim: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: 1,
    },
    rows: {
      type: Number,
      default: 5,
    },
    cols: {
      type: Number,
      default: 10,
    },
    seats: [seatSchema],

    // Current live status
    currentOccupancy: {
      type: Number,
      default: 0,
    },
    occupancyPercentage: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['free', 'busy', 'full'],
      default: 'free',
    },
    statusColor: {
      type: String,
      enum: ['green', 'yellow', 'red'],
      default: 'green',
    },

    // Media source config
    mediaType: {
      type: String,
      enum: ['image', 'video', 'webcam', 'ip_stream', 'none'],
      default: 'none',
    },
    mediaUrl: { type: String, default: null },
    streamUrl: { type: String, default: null }, // RTSP or IP stream

    // Supabase storage path
    storagePath: { type: String, default: null },

    lastAnalyzedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Auto-generate seats grid when rows/cols are set
placeSchema.methods.generateSeats = function () {
  const seats = [];
  for (let r = 0; r < this.rows; r++) {
    for (let c = 0; c < this.cols; c++) {
      seats.push({
        seatId: `R${r + 1}C${c + 1}`,
        row: r,
        col: c,
        isOccupied: false,
        label: `${String.fromCharCode(65 + r)}${c + 1}`,
      });
    }
  }
  this.seats = seats;
  return seats;
};

// Compute status from occupancy percentage
placeSchema.methods.computeStatus = function (count) {
  this.currentOccupancy = count;
  this.occupancyPercentage = Math.min(
    100,
    Math.round((count / this.capacity) * 100)
  );
  const pct = this.occupancyPercentage;
  if (pct < 40) {
    this.status = 'free';
    this.statusColor = 'green';
  } else if (pct < 75) {
    this.status = 'busy';
    this.statusColor = 'yellow';
  } else {
    this.status = 'full';
    this.statusColor = 'red';
  }

  // Update seat occupancy randomly distributed (visual simulation)
  const occupiedCount = Math.round((this.seats.length * pct) / 100);
  const shuffled = [...this.seats].sort(() => Math.random() - 0.5);
  this.seats = this.seats.map((s) => ({ ...s, isOccupied: false }));
  for (let i = 0; i < occupiedCount && i < this.seats.length; i++) {
    const target = this.seats.findIndex(
      (s) => s.seatId === shuffled[i].seatId
    );
    if (target >= 0) this.seats[target].isOccupied = true;
  }
  this.lastAnalyzedAt = new Date();
};

module.exports = mongoose.model('Place', placeSchema);
