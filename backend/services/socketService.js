const Place = require('../models/Place');

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // On connect, send current status of all places
    socket.on('request:allStatus', async () => {
      try {
        const places = await Place.find({ isActive: true }).select(
          'name location status statusColor currentOccupancy occupancyPercentage capacity lastAnalyzedAt mediaUrl seats'
        );
        socket.emit('status:all', { places });
      } catch (err) {
        socket.emit('error', { message: 'Failed to fetch status.' });
      }
    });

    // Client subscribes to a specific place
    socket.on('subscribe:place', (placeId) => {
      socket.join(`place:${placeId}`);
      console.log(`Client ${socket.id} subscribed to place ${placeId}`);
    });

    socket.on('unsubscribe:place', (placeId) => {
      socket.leave(`place:${placeId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = { socketHandler };
