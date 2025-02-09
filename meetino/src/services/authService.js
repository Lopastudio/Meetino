import axios from 'axios';

const API_URL = 'http://localhost:3010/api';

export const loginUser = async (username, password) => {
  const response = await axios.post(`${API_URL}/auth/login`, { username, password });
  return response.data.token;
};

export const registerUser = async (username, password) => {
  const response = await axios.post(`${API_URL}/auth/register`, { username, password });
  return response.data.token;
};
