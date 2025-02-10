const express = require('express');
require('dotenv').config();
const app = express();
const http = require('http').createServer(app);
const port = process.env.PORT;

const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { app, saltRounds, connection } = require('./LoginBackend');

const saltRounds = 10;

const io = require('socket.io')(http);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// database-login
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL!');
});

app.post('/setup-database', (req, res) => {
    const sql = `
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
    //error handling
    connection.query(sql, (err, result) => {
      if (err) {
        console.error('Error creating users table:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      //the think everyone wants to see
      console.log('Users table created!');
      res.json({ message: 'Database tables created!' });
    });
  });

//Register API
app.post('/register', (req, res) => {
  const { email, username, password, favorites } = req.body;

  //Encrypting user password
  bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
    if (err) {
      console.error('Error encrypting password:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    //Insert user data into database
    const sql = 'INSERT INTO users (email, username, password, favorites) VALUES (?, ?, ?, ?)';
    const values = [email, username, hashedPassword, favorites];

    //error handling
    connection.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error inserting user into database:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      //logging
      console.log(`User ${username} registered!`);

      // Create JWT token
      const token = jwt.sign({ username }, 'secret_key', { expiresIn: '1h' });

      res.json({ token });
    });
  });
});

// Login API
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Get user data from database
  const sql = 'SELECT * FROM users WHERE username = ?';
  const values = [username];
  //error handling
  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error getting user data from database:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (result.length === 0) {
      console.log(`User ${username} not found!`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Compare recieved password with the password located in the database
    bcrypt.compare(password, result[0].password, (err, passwordMatch) => {
      //error handling
      if (err) {
        console.error('Error comparing passwords:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!passwordMatch) {
        console.log(`Invalid password for user ${username}!`);
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      console.log(`User ${username} logged in!`);

      // Create JWT token
      const token = jwt.sign({ username }, 'secret_key', { expiresIn: '1h' });

      res.json({ token });
    });
  });
});

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

    socket.on('get-username', function() {
        socket.emit({username: "sigma_boy"});
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