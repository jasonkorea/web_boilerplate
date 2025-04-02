const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { setupWebSocketServer } = require('./websocket');
const { connectToDB } = require('./db');
const { setupAuth } = require('./auth');
const roomRoutes = require('./routes/rooms');

require('dotenv').config();

const app = express();

app.use(express.json());

const sslOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH),
};

const server = https.createServer(sslOptions, app);

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

const PORT = process.env.PORT || 3443;
server.listen(PORT, () => {
    console.log(`HTTPS server running on https://localhost:${PORT}`);
});
