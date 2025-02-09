import React, { useState } from 'react';
import { sendMessage } from '../services/messageService';

const ChatRoom = () => {
  const [message, setMessage] = useState('');

  const handleSendMessage = async () => {
    if (message) {
      await sendMessage(message);
      setMessage('');
    }
  };

  return (
    <div className="p-4">
      <div className="space-y-4">
        <div className="border p-2 h-72 overflow-y-auto">
          {/* List messages here */}
        </div>
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Type a message"
          />
          <button onClick={handleSendMessage} className="py-2 px-4 bg-blue-500 text-white rounded">
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
