const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const { initDB } = require('./db');
const { router, setWSS } = require('./routes/render');

const PORT = 3001;

const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use('/api', router);

const server = http.createServer(app);

const wss = new WebSocketServer({ server });
setWSS(wss);

wss.on('connection', (ws) => {
  ws.on('error', () => {});
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

initDB();

server.listen(PORT, () => {
  console.log(`VEON server running on http://localhost:${PORT}`);
});
