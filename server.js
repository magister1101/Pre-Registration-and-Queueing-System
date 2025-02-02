const http = require('http');
const app = require('./app');

const socketIo = require('socket.io');
const Queue = require('./api/models/queue');
const queueRoutes = require('./api/routes/queues');

const port = process.env.PORT || 3000;
const server = http.createServer(app);

const io = socketIo(server, {
    cors: {
        origin: "*", // Allow frontend connections
        methods: ["GET", "POST", "PUT"]
    }
});

const destinations = ['registrar', 'osas', 'cashier']; // Define available destinations

// WebSocket connection
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// Function to emit queue updates
const emitQueueUpdate = async () => {
    try {
        const queues = {};
        for (const dest of destinations) {
            const queue = await Queue.findOne({ destination: dest, status: 'Waiting' })
                .sort({ createdAt: 1 })
                .populate('courseToTake', 'courseName');
            queues[dest] = queue || null;
        }
        io.emit('queueUpdated', queues);
    } catch (error) {
        console.error("Error emitting queue update:", error);
    }
};

// Use queue routes
app.use('/queue', queueRoutes);


server.listen(port, () => {
    console.log(`Live: http://localhost:${port}`);
});

module.exports = { emitQueueUpdate, io };

