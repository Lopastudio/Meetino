const express = require('express');
const router = express.Router();

// List of rooms
let rooms = [];

// Create room
router.post('/create', (req, res) => {
    const { roomName } = req.body;

    if (rooms.includes(roomName)) {
        return res.status(400).json({ msg: 'Room already exists' });
    }

    rooms.push(roomName);
    res.status(201).json({ msg: 'Room created' });
});

// List rooms
router.get('/list', (req, res) => {
    res.json({ rooms });
});

module.exports = router;
