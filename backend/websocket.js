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
        const { room, user } = query;

        if (!room || !user) {
            ws.close();
            return;
        }

        // 채팅방 없으면 MongoDB에 생성
        await Room.findOneAndUpdate(
            { name: room },
            { name: room },
            { upsert: true, new: true }
        );

        // ✅ 사용자 정보 WebSocket 객체에 저장 (퇴장 시 사용)
        ws._room = room;
        ws._user = user;

        if (!rooms[room]) rooms[room] = [];
        rooms[room].push(ws);

        // 접속 메시지 브로드캐스트
        broadcast(room, { type: 'system', text: `${user}님이 입장하였습니다.` });

        // 이전 메시지 전송
        const history = await Message.find({ room }).sort({ createdAt: 1 }).limit(50);
        history.forEach(msg => {
            ws.send(JSON.stringify({ user: msg.user, text: msg.text, type: 'history' }));
        });

        ws.on('message', async (msg) => {
            const data = JSON.parse(msg);

            if (data.type === 'message') {
                const message = new Message({ user, text: data.text, room });
                await message.save();

                broadcast(room, { user, text: data.text, type: 'chat' });
            }
        });

        ws.on('close', () => {
            const room = ws._room;
            const user = ws._user;

            if (rooms[room]) {
                rooms[room] = rooms[room].filter(client => client !== ws);

                // ✅ 퇴장 메시지 브로드캐스트
                broadcast(room, {
                    type: 'system',
                    text: `${user}님이 퇴장하였습니다.`
                });

                // ✅ 빈 방이면 메모리에서 제거 (선택 사항)
                if (rooms[room].length === 0) {
                    delete rooms[room];
                }
            }
        });
    });
}

// 방에 있는 모든 사용자에게 메시지 전송
function broadcast(room, message) {
    if (!rooms[room]) return;
    rooms[room].forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    });
}

module.exports = { setupWebSocketServer };
