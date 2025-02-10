const express = require('express');
require('dotenv').config();
const app = express();
const http = require('http').createServer(app);
const port = process.env.PORT;

const io = require('socket.io')(http);

let messages = []; // Array to store messages

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/socket.io', (req, res) => {
    res.sendFile(__dirname + '/public/socket.io.js');
});

http.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

io.on('connection', function(socket) {
    console.log('A user has connected! Socket ID:', socket.id);

    // Send stored messages to the newly connected client
    socket.emit('previous-messages', messages);

    socket.on('disconnect', function() {
        console.log('User disconnected');
    });

    socket.on('msg-event', function(msg_content) {
        console.log('Message:', msg_content.message, 'Target:', msg_content.target);
        
        // Add sender's socket ID to the message content
        msg_content.sender = socket.id;

        // Save the message to the array
        messages.push(msg_content);

        if (msg_content.target) {
            console.log(`Sending message to target: ${msg_content.target}`);
            socket.to(msg_content.target).emit('msg-event', msg_content);
        } else {
            console.log('Broadcasting message to all clients');
            io.emit('msg-event', msg_content); // Send to all, including sender
        }
    });
    
});