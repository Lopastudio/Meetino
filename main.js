const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const messageRoutes = require('./routes/messages');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
    "http://localhost:3000",  // Localhost
    "http://192.168.1.118:3000"  // Local network IP
];

app.use(cors({
    origin: function (origin, callback) {
        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);  // Allow the origin
        } else {
            callback(new Error('Not allowed by CORS'));  // Deny the origin
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Access-Control-Allow-Origin"],
    credentials: true  // Allow cookies & headers if needed
}));

app.use(express.json()); // ✅ Ensure JSON parsing

// ✅ Custom Middleware (Extra Safety)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin || '*'); // Dynamically set the correct origin
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Expose-Headers", "Access-Control-Allow-Origin");
    next();
});

// Connect to MongoDB
connectDB();

// ✅ Define API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);

// ✅ Setup Socket.io with CORS
const io = new Server(server, {
    cors: {
        origin: "http://192.168.1.118:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('joinRoom', (room) => {
        socket.join(room);
        console.log(`User joined room: ${room}`);
    });

    socket.on('sendMessage', (message) => {
        io.to(message.receiver).emit('receiveMessage', message);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// ✅ Start the server
server.listen(3010, () => {
    console.log(`Server running on port 3010`);
});
