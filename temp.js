const express = require('express');
require('dotenv').config();
const app = express();
const http = require('http').createServer(app);
const port = process.env.PORT || 3000;

const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mariadb = require('mariadb');
const cors = require('cors');

const saltRounds = 10;

const io = require('socket.io')(http, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

async function connectToDatabase() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('Connected to MariaDB!');
  } catch (err) {
    console.error('Error connecting to MariaDB:', err);
  } finally {
    if (conn) conn.release();
  }
}

connectToDatabase();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, 'secret_key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Register route
app.post('/register', async (req, res) => {
  const { email, username, password, favorites } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const sql = 'INSERT INTO users (email, username, password) VALUES (?, ?, ?)';
    const values = [email, username, hashedPassword];

    const conn = await pool.getConnection();
    const result = await conn.query(sql, values);
    const userId = result.insertId;

    // Create an empty profile for the user
    const profileSql = 'INSERT INTO profiles (user_id, favorites) VALUES (?, ?)';
    await conn.query(profileSql, [userId, favorites]);
    conn.release();

    console.log(`User ${username} registered!`);

    const token = jwt.sign({ username, userId }, 'secret_key', { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('Error inserting user into database:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const sql = 'SELECT * FROM users WHERE username = ?';
  const values = [username];

  try {
    const conn = await pool.getConnection();
    const result = await conn.query(sql, values);

    if (result.length === 0) {
      console.log(`User ${username} not found!`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const passwordMatch = await bcrypt.compare(password, result[0].password);
    if (!passwordMatch) {
      console.log(`Invalid password for user ${username}!`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    console.log(`User ${username} logged in!`);

    const token = jwt.sign({ username }, 'secret_key', { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('Error getting user data from database:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auth route to validate the JWT token
app.get('/auth', authenticateToken, (req, res) => {
    res.json({ user: req.user }); // Respond with the user object if token is valid
  });

// Profile routes
// Get profile details
app.get('/profile', authenticateToken, async (req, res) => {
  const { userId } = req.user;

  try {
    const conn = await pool.getConnection();
    const profileQuery = 'SELECT * FROM profiles WHERE user_id = ?';
    const profileResult = await conn.query(profileQuery, [userId]);

    if (profileResult.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profileResult[0]); // Send back the profile data
  } catch (err) {
    console.error('Error retrieving profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update profile details
app.put('/profile', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { bio, profile_picture_url, favorites } = req.body;

  try {
    const conn = await pool.getConnection();
    const profileQuery = 'UPDATE profiles SET bio = ?, profile_picture_url = ?, favorites = ? WHERE user_id = ?';
    await conn.query(profileQuery, [bio, profile_picture_url, favorites, userId]);

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start HTTP server
http.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

let socketUserMap = {}; // Store socketId -> username mapping

io.on('connection', function(socket) {
    console.log('A user has connected! Socket ID:', socket.id);

    // When a user joins, store the username with the socket ID
    socket.on('set-username', (username) => {
        socketUserMap[socket.id] = username; // Store the username with the socket id
        console.log(`${username} is connected with Socket ID: ${socket.id}`);
    });

    // Send stored messages to the newly connected client
    socket.emit('previous-messages', messages);

    socket.on('disconnect', function() {
        console.log('User disconnected');
        // Remove the user from the socket-user map when they disconnect
        delete socketUserMap[socket.id];
    });

    socket.on('get-username', function() {
        socket.emit({ username: "sigma_boy" });
    });

    // Handle messages
    socket.on('msg-event', function(msg_content) {
        console.log('Message:', msg_content.message, 'Target:', msg_content.target);
        
        // Ensure the message contains the sender's username
        msg_content.sender = msg_content.sender || "Unknown User";  // Default to "Unknown User" if no sender provided

        // Save the message to the array
        messages.push(msg_content);

        // If a target username is specified, find the socket ID and send the message to that socket
        if (msg_content.target) {
            // Find the target socket ID using the username
            const targetSocketId = Object.keys(socketUserMap).find(socketId => socketUserMap[socketId] === msg_content.target);
            
            if (targetSocketId) {
                console.log(`Sending message to target: ${msg_content.target}`);
                socket.to(targetSocketId).emit('msg-event', msg_content);
            } else {
                console.log(`Target username not found: ${msg_content.target}`);
                // Optionally, you could notify the sender that the target is not found
            }
        } else {
            console.log('Broadcasting message to all clients');
            io.emit('msg-event', msg_content); // Send to all, including sender
        }
    });
});

