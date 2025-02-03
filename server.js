const http = require('http');
const app = require('./app');
const { initializeWebSocket } = require('./websocket');

const port = process.env.PORT || 3000;
const server = http.createServer(app);

initializeWebSocket(server); // Initialize WebSocket

server.listen(port, () => {
    console.log(`Live: http://localhost:${port}`);
});

