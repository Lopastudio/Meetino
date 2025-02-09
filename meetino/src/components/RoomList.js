import React, { useEffect, useState } from 'react';
import { getRooms } from '../services/messageService';

const RoomList = () => {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const fetchRooms = async () => {
      const fetchedRooms = await getRooms();
      setRooms(fetchedRooms);
    };
    fetchRooms();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Chat Rooms</h2>
      {rooms.map((room) => (
        <div key={room} className="flex justify-between items-center border-b py-2">
          <span>{room}</span>
          <button className="bg-blue-500 text-white px-4 py-2 rounded">Join</button>
        </div>
      ))}
    </div>
  );
};

export default RoomList;
