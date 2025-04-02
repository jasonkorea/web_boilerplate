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
    const { name } = req.params;

    await Room.deleteOne({ name });
    await Message.deleteMany({ room: name }); // ✅ 메시지도 함께 삭제
    console.log(`🗑️ 방 '${name}' 및 해당 메시지 삭제 완료`);

    res.status(204).end();
});

module.exports = router;
