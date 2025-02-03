const WebSocket = require('ws');

let wss;

const initializeWebSocket = (server) => {
    wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {
        console.log('New WebSocket client connected');

        ws.on('close', () => {
            console.log('Client disconnected');
        });
    });
};

const broadcastUpdate = (data) => {
    if (wss) {
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    }
};

module.exports = { initializeWebSocket, broadcastUpdate };
