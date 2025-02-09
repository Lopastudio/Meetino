import axios from 'axios';

const API_URL = 'http://localhost:3010/api';

export const getRooms = async () => {
  const response = await axios.get(`${API_URL}/rooms/list`);
  return response.data.rooms;
};

export const sendMessage = async (message) => {
  const token = localStorage.getItem('token');
  await axios.post(
    `${API_URL}/messages/send`,
    { content: message },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};
