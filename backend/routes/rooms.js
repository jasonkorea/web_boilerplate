const express = require('express');
const router = express.Router();
const Room = require('../models/room');
const Message = require('../models/message'); // ✅ 추가됨

// 전체 방 조회
router.get('/', async (req, res) => {
    const rooms = await Room.find({}, 'name');
    res.json(rooms.map(r => r.name));
});

// 방 생성
router.post('/', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Room name is required' });

    try {
        const room = await Room.create({ name });
        res.status(201).json({ name: room.name });
    } catch (err) {
        res.status(409).json({ error: 'Room already exists' });
    }
});

// 방 삭제
router.delete('/:name', async (req, res) => {
    const name = decodeURIComponent(req.params.name); // URL 디코딩

    try {
        const room = await Room.findOne({ name });
        if (room) {
            await Message.deleteMany({ room: room._id }); // 메시지 삭제
            await Room.deleteOne({ _id: room._id }); // 방 삭제
            console.log(`🗑️ 방 '${name}' 및 메시지 삭제 완료`);

            // ✅ 방 삭제 후 204 상태 코드 반환 (No Content)
            return res.status(204).send(); // 응답 없이 성공 처리
        } else {
            console.warn(`❗ 방 '${name}'이 존재하지 않아 삭제하지 않음`);
            return res.status(404).json({ error: 'Room not found' }); // 방이 존재하지 않을 경우
        }
    } catch (err) {
        console.error(`❌ 방 삭제 중 오류:`, err);
        return res.status(500).json({ error: 'Internal server error' }); // 500 서버 에러 처리
    }
});


module.exports = router;
