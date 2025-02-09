const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const apiUrl = 'http://localhost:3000/api/auth';  // Make sure this URL points to your backend

// Function to register a new user
const registerUser = async (username, password) => {
    try {
        const response = await axios.post(`${apiUrl}/register`, {
            username,
            password
        });
        console.log('User registered successfully:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('Error:', error.response.data.msg || error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
};

// Prompt for user input
const askQuestions = () => {
    rl.question('Enter username: ', (username) => {
        rl.question('Enter password: ', (password) => {
            registerUser(username, password).then(() => {
                rl.close();
            });
        });
    });
};

askQuestions();
