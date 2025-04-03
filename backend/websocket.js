const WebSocket = require('ws');
const url = require('url');
const Message = require('./models/message');
const Room = require('./models/room');

const rooms = {}; // { roomName: [ws1, ws2, ...] }

function setupWebSocketServer(server) {
    const wss = new WebSocket.Server({ noServer: true });

    server.on('upgrade', (req, socket, head) => {
        const { pathname, query } = url.parse(req.url, true);

        if (pathname === '/ws') {
            wss.handleUpgrade(req, socket, head, (ws) => {
                wss.emit('connection', ws, req, query);
            });
        }
    });

    wss.on('connection', async (ws, req, query) => {
        const { room: roomName, user } = query;

        if (!roomName || !user) {
            ws.close();
            return;
        }

        const roomDoc = await Room.findOneAndUpdate(
            { name: roomName },
            { name: roomName },
            { upsert: true, new: true }
        );

        const roomId = roomDoc._id;

        // WebSocket에 정보 저장
        ws._roomName = roomName;
        ws._roomId = roomId;
        ws._user = user;

        if (!rooms[roomName]) {
            rooms[roomName] = [];
        }

        // ✅ 동일 소켓 중복 등록 방지
        if (!rooms[roomName].includes(ws)) {
            rooms[roomName].push(ws);
        }

        // ✅ 입장 메시지 생성 시간 기록
        const now = new Date();

        // ✅ 1. 실시간 브로드캐스트
        broadcast(roomName, {
            type: 'system',
            text: `${user}님이 입장하였습니다.`,
        });

        // ✅ 2. DB에 시스템 메시지 저장
        await Message.create({
            user: '[system]',
            text: `${user}님이 입장하였습니다.`,
            room: roomId,
            type: 'system',
            createdAt: now
        });

        // ✅ 3. 히스토리 전송 (입장 직전까지만)
        const history = await Message.find({
            room: roomId,
            createdAt: { $lt: now - 100 }
        }).sort({ createdAt: 1 }).limit(50);

        history.forEach(msg => {
            ws.send(JSON.stringify({
                user: msg.user,
                text: msg.text,
                type: msg.type === 'system' ? 'system' : 'history'
            }));
        });

        ws.on('message', async (msg) => {
            const data = JSON.parse(msg);

            if (data.type === 'message') {
                const message = new Message({
                    user,
                    text: data.text,
                    room: roomId,
                    type: 'chat',
                });
                await message.save();

                broadcast(roomName, {
                    user,
                    text: data.text,
                    type: 'chat',
                });
            }
        });

        ws.on('close', async () => {
            const roomName = ws._roomName;
            const user = ws._user;
            const roomId = ws._roomId;

            if (rooms[roomName]) {
                rooms[roomName] = rooms[roomName].filter(client => client !== ws);

                // ✅ 현재 시각 기록
                const now = new Date();

                // ✅ 실시간 브로드캐스트
                broadcast(roomName, {
                    type: 'system',
                    text: `${user}님이 퇴장하였습니다.`,
                });

                // ✅ DB 저장 (입장 시각과 동일 방식)
                await Message.create({
                    user: '[system]',
                    text: `${user}님이 퇴장하였습니다.`,
                    room: roomId,
                    type: 'system',
                    createdAt: now,
                });

                if (rooms[roomName].length === 0) {
                    delete rooms[roomName];
                    console.log(`🗑️ 방 '${roomName}' 삭제됨`);
                }
            }
        });
    });
}

// 방에 있는 모든 사용자에게 메시지 전송
function broadcast(roomName, message) {
    if (!rooms[roomName]) return;
    console.log(`📢 브로드캐스트 [${roomName}]: ${message.text} → 대상 ${rooms[roomName].length}명`);

    rooms[roomName].forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    });
}

module.exports = { setupWebSocketServer };
