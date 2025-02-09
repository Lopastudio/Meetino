const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// Send message
router.post('/send', async (req, res) => {
    const { senderId, receiverId, content, room } = req.body;

    try {
        const newMessage = new Message({
            sender: senderId,
            receiver: receiverId,
            content,
            room,
        });

        await newMessage.save();
        res.status(200).json({ msg: 'Message sent' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// Get messages by room or direct
router.get('/messages', async (req, res) => {
    const { senderId, receiverId, room } = req.query;

    let filter = {};
    if (room) {
        filter.room = room;
    } else {
        filter.$or = [
            { sender: senderId, receiver: receiverId },
            { sender: receiverId, receiver: senderId },
        ];
    }

    try {
        const messages = await Message.find(filter).populate('sender receiver');
        res.json({ messages });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
