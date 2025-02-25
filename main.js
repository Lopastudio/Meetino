const express = require('express');
require('dotenv').config();
const app = express();
const http = require('http').createServer(app);
const port = process.env.PORT || 3010;

const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mariadb = require('mariadb');
const cors = require('cors');
const winston = require('winston');

const saltRounds = 10;

// Configure winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});

// Create Socket.IO instance and pass HTTP server
const io = require('socket.io')(http, {
  cors: {
    origin: "http://localhost:5173", // Allow the frontend to connect
    methods: ["GET", "POST", "PUT"], // Allow GET, POST, PUT requests
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Allow credentials (cookies, authorization headers)
  },
});

app.use(
  cors({
    origin: "http://localhost:5173", // Allow frontend origin
    methods: ["GET", "POST", "PUT"], // Allow PUT, GET, POST methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allow necessary headers
    credentials: true, // Allow credentials like cookies and tokens
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database login
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10 // Increase the connection limit
});

async function connectToDatabase() {
  let conn;
  try {
    conn = await pool.getConnection();
    logger.info('Connected to MariaDB!');
  } catch (err) {
    logger.error('Error connecting to MariaDB:', err);
  } finally {
    if (conn) conn.release(); // release to pool
  }
}

connectToDatabase();

app.post('/setup-database', async (req, res) => {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT(11) NOT NULL AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL,
      username VARCHAR(191) NOT NULL,
      password VARCHAR(255) NOT NULL,
      favorites TEXT,
      PRIMARY KEY (id),
      UNIQUE KEY (username)
    );
  `;

  const createMessagesTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id INT(11) NOT NULL AUTO_INCREMENT,
      sender VARCHAR(191) NOT NULL,
      message TEXT NOT NULL,
      target VARCHAR(191),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    );
  `;

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query(createUsersTable);
    await conn.query(createMessagesTable);
    logger.info('Users and messages tables created!');
    res.json({ message: 'Database tables created!' });
  } catch (err) {
    logger.error('Error creating database tables:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) conn.release();
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1]; // Extract token from Authorization header

  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, 'secret_key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user; // Attach user info to the request
    next(); // Proceed to the next middleware or route handler
  });
};

// Register route
app.post('/register', async (req, res) => {
  const { email, username, password, favorites } = req.body;

  let conn;
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const sql = 'INSERT INTO users (email, username, password, favorites) VALUES (?, ?, ?, ?)';
    const values = [email, username, hashedPassword, favorites];

    conn = await pool.getConnection();
    await conn.query(sql, values);
    logger.info(`User ${username} registered!`);

    const token = jwt.sign({ username }, 'secret_key', { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    logger.error('Error inserting user into database:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) conn.release();
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const sql = 'SELECT * FROM users WHERE username = ?';
  const values = [username];

  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(sql, values);

    if (result.length === 0) {
      logger.info(`User ${username} not found!`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const passwordMatch = await bcrypt.compare(password, result[0].password);
    if (!passwordMatch) {
      logger.info(`Invalid password for user ${username}!`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    logger.info(`User ${username} logged in!`);

    const token = jwt.sign({ username }, 'secret_key', { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    logger.error('Error getting user data from database:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) conn.release();
  }
});

// Route to add a friend to the user's favorites list
app.post('/send-friend-request', authenticateToken, async (req, res) => {
  const { friendUsername } = req.body;
  const username = req.user.username;

  let conn;
  try {
    conn = await pool.getConnection();

    // Check if the friend exists
    const [friend] = await conn.query('SELECT id FROM users WHERE username = ?', [friendUsername]);
    if (friend.length === 0) {
      return res.status(404).json({ error: 'Friend not found' });
    }

    // Check if a friend request already exists
    const [existingRequest] = await conn.query(
      'SELECT * FROM friend_requests WHERE sender = ? AND receiver = ?',
      [username, friendUsername]
    );
    if (existingRequest.length > 0) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    // Insert friend request
    await conn.query('INSERT INTO friend_requests (sender, receiver, status) VALUES (?, ?, "pending")',
      [username, friendUsername]);

    res.status(200).json({ message: 'Friend request sent' });
  } catch (err) {
    logger.error('Error sending friend request:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) conn.release();
  }
});

app.post('/accept-friend-request', authenticateToken, async (req, res) => {
  const { senderUsername } = req.body;
  const receiverUsername = req.user.username;

  let conn;
  try {
    conn = await pool.getConnection();

    // Check if there is a pending friend request
    const [request] = await conn.query(
      'SELECT * FROM friend_requests WHERE sender = ? AND receiver = ? AND status = "pending"',
      [senderUsername, receiverUsername]
    );

    if (request.length === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Get current user's friends list
    const [receiver] = await conn.query('SELECT favorites FROM users WHERE username = ?', [receiverUsername]);
    const receiverFavorites = receiver[0].favorites ? JSON.parse(receiver[0].favorites) : [];

    // Get sender's friends list
    const [sender] = await conn.query('SELECT favorites FROM users WHERE username = ?', [senderUsername]);
    const senderFavorites = sender[0].favorites ? JSON.parse(sender[0].favorites) : [];

    // Add each other as friends
    if (!receiverFavorites.includes(senderUsername)) receiverFavorites.push(senderUsername);
    if (!senderFavorites.includes(receiverUsername)) senderFavorites.push(receiverUsername);

    await conn.query('UPDATE users SET favorites = ? WHERE username = ?', [JSON.stringify(receiverFavorites), receiverUsername]);
    await conn.query('UPDATE users SET favorites = ? WHERE username = ?', [JSON.stringify(senderFavorites), senderUsername]);

    // Mark request as accepted
    await conn.query('UPDATE friend_requests SET status = "accepted" WHERE sender = ? AND receiver = ?',
      [senderUsername, receiverUsername]);

    res.status(200).json({ message: 'Friend request accepted' });
  } catch (err) {
    logger.error('Error accepting friend request:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) conn.release();
  }
});


app.get('/profile/:id', async (req, res) => {
  const { id } = req.params;

  let conn;
  try {
    conn = await pool.getConnection();

    const userResult = await conn.query(
      'SELECT id, username, bio, profile_picture_url, favorites FROM users WHERE id = ?',
      [id]
    );

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult[0];
    const favorites = user.favorites ? JSON.parse(user.favorites) : [];

    res.status(200).json({
      username: user.username,
      bio: user.bio || '',
      profile_picture_url: user.profile_picture_url || '',
      favorites,
    });
  } catch (err) {
    logger.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) conn.release();
  }
});


// Route to search for users by username
app.get('/search-users', authenticateToken, async (req, res) => {
  const { query } = req.query; // Get the search query from the request

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    // Query the database for users whose usernames match the search query
    const sql = 'SELECT username FROM users WHERE username LIKE ? LIMIT 10';  // Limit to 10 results
    const values = [`%${query}%`];  // Use % for partial matching

    const result = await conn.query(sql, values);

    if (result.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    // Return the list of usernames that match the search query
    res.status(200).json(result);  // Sending back the list of users
  } catch (err) {
    logger.error('Error searching for users:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) conn.release();
  }
});

app.put('/profile', authenticateToken, async (req, res) => {
  logger.info("Updating profile...");
  const username = req.user.username;
  const { bio, profile_picture_url } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();
    const userResult = await conn.query('SELECT id FROM users WHERE username = ?', [username]);
    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult[0].id;

    const sql = `
      UPDATE users 
      SET bio = ?, profile_picture_url = ?
      WHERE id = ?
    `;
    const values = [bio, profile_picture_url, userId];

    await conn.query(sql, values);

    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (err) {
    logger.error('Error updating profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) conn.release();
  }
});

// Route to get the user's profile
app.get('/profile', authenticateToken, async (req, res) => {
  const username = req.user.username;

  let conn;
  try {
    conn = await pool.getConnection();
    // Modify the query to fetch profile_picture_url and bio along with favorites
    const userResult = await conn.query(
      'SELECT id, favorites, bio, profile_picture_url FROM users WHERE username = ?',
      [username]
    );

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult[0];
    const favorites = user.favorites ? JSON.parse(user.favorites) : [];

    // Return the profile with the bio, profile_picture_url, and updated favorites list
    res.status(200).json({
      bio: user.bio || '', // If bio is null, return an empty string
      profile_picture_url: user.profile_picture_url || '', // If no profile picture, return empty string
      favorites,
    });
  } catch (err) {
    logger.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) conn.release();
  }
});

// Auth route to validate the JWT token
app.get('/auth', authenticateToken, (req, res) => {
  res.json({ user: req.user }); // Respond with the user object if token is valid
});

// Socket.IO connections
let messages = []; // Array to store messages
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/socket.io', (req, res) => {
  res.sendFile(__dirname + '/public/socket.io.js');
});

// Start HTTP server
http.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

let socketUserMap = {}; // Store socketId -> username mapping

io.on('connection', function (socket) {
  logger.info(`A user has connected! Socket ID: ${socket.id}`);

  // Send previous messages to the client
  socket.emit('previous-messages', messages);

  // When a user joins, store the username with the socket ID
  socket.on('set-username', async (username) => {
    socketUserMap[socket.id] = username; // Store the username with the socket id
    logger.info(`${username} is connected with Socket ID: ${socket.id}`);

    let conn;
    try {
      conn = await pool.getConnection();
      const userResult = await conn.query('SELECT id FROM users WHERE username = ?', [username]);

      if (userResult.length === 0) {
        logger.error('User not found!');
        return;
      }

      const userId = userResult[0].id;
      const [profile] = await conn.query('SELECT * FROM users WHERE id = ?', [userId]);

      if (profile) {
        logger.info('Sending user profile:', profile);
        socket.emit('user-profile', profile);
      }
    } catch (err) {
      logger.error('Error fetching profile:', err);
    } finally {
      if (conn) conn.release();
    }
  });

  // Handle messages
  socket.on('msg-event', function (msg_content) {
    logger.info(`Message: ${msg_content.message}, Target: ${msg_content.target}`);

    msg_content.sender = msg_content.sender || "Unknown User";  // Default to "Unknown User" if no sender provided

    messages.push(msg_content);

    if (msg_content.target) {
      const targetSocketId = Object.keys(socketUserMap).find(socketId => socketUserMap[socketId] === msg_content.target);

      if (targetSocketId) {
        logger.info(`Sending message to target: ${msg_content.target}`);
        socket.to(targetSocketId).emit('msg-event', msg_content);
      } else {
        logger.info(`Target username not found: ${msg_content.target}`);
      }
    } else {
      logger.info('Broadcasting message to all clients');
      io.emit('msg-event', msg_content);
    }
  });

  socket.on('disconnect', function () {
    logger.info('User disconnected');
    delete socketUserMap[socket.id]; // Remove the user from the map
  });
});

// Save messages to the database every minute
setInterval(async () => {
  if (messages.length > 0) {
    let conn;
    try {
      conn = await pool.getConnection();
      const sql = 'INSERT INTO messages (sender, message, target) VALUES (?, ?, ?)';
      const values = messages.map(msg => [msg.sender, msg.message, msg.target]);
      await conn.batch(sql, values);
      messages = []; // Clear the messages array after saving to the database
      logger.info('Messages saved to the database');
    } catch (err) {
      logger.error('Error saving messages to the database:', err);
    } finally {
      if (conn) conn.release();
    }
  }
}, 60000); // Save messages every 60 seconds

// Load messages from the database when the server starts
(async () => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query('SELECT sender, message, target FROM messages ORDER BY timestamp ASC');
    messages = result.map(row => ({
      sender: row.sender,
      message: row.message,
      target: row.target,
    }));
    logger.info('Messages loaded from the database');
  } catch (err) {
    logger.error('Error loading messages from the database:', err);
  } finally {
    if (conn) conn.release();
  }
})();

