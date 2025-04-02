const express = require('express');
const http = require('http');
const path = require('path');
const { setupWebSocketServer } = require('./websocket');
const { connectToDB } = require('./db');
const { setupAuth } = require('./auth');
const roomRoutes = require('./routes/rooms');

require('dotenv').config();

const app = express();
const server = http.createServer(app);

app.use(express.json());

// MongoDB 연결
connectToDB();

// 인증 설정
setupAuth(app);

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, '../frontend')));

// ✅ rooms 라우터 등록
app.use('/rooms', roomRoutes);

// WebSocket 서버 설정
setupWebSocketServer(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`HTTP server running on http://localhost:${PORT}`);
});
