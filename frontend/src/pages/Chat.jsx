import { useEffect, useState, useContext } from "react";
import io from "socket.io-client";
import { AuthContext } from "../contexts/AuthContext";
import { ToastContainer, toast, Bounce } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

const socket = io("http://localhost:3010");

const Chat = () => {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("");

  // Fetch previous messages when the component mounts
  useEffect(() => {
    socket.on("previous-messages", (previousMessages) => {
      setMessages(previousMessages); // Set the previous messages to state
    });

    socket.on("msg-event", (msg) => {
      setMessages((prev) => [...prev, msg]); // Add new messages to the state
      if (msg.sender !== user?.username) {
        toast(`${msg.sender}: ${msg.message}`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
          transition: Bounce,
        });
      }
    });

    socket.emit("set-username", user?.username);

    return () => {
      socket.off("previous-messages");
      socket.off("msg-event");
    };
  }, [user]);

  const sendMessage = () => {
    if (message.trim() !== "") {
      socket.emit("msg-event", { message, sender: user?.username, target });
      setMessage(""); // Reset message input field
    }
  };

  if (!user)
    return (
      <p className="text-center mt-10 text-gray-500">Please log in to chat.</p>
    );

  return (
    <div className="container mx-auto mt-5 p-4 bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 rounded-lg shadow-lg">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Bounce}
      />
      <div className="border p-4 rounded-lg shadow-md h-60 overflow-y-scroll bg-white scrollbar-thin scrollbar-thumb-indigo-500 scrollbar-track-indigo-200">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500">
            No messages yet. Start chatting!
          </p>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-4 p-3 rounded-lg max-w-xs ${
                msg.sender === user?.username
                  ? "bg-blue-100 self-end"
                  : "bg-gray-100"
              }`}
              style={{
                alignSelf:
                  msg.sender === user?.username ? "flex-end" : "flex-start",
              }}
            >
              <p className="text-sm font-semibold text-gray-700">
                <strong>{msg.sender}:</strong>
                <span className="text-gray-500 text-xs ml-2">
                  ({msg.target && `Target: ${msg.target}`})
                </span>
              </p>
              <p className="text-gray-800 mt-1">{msg.message}</p>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex gap-4">
        <input
          type="text"
          placeholder="Enter message"
          className="border p-3 flex-1 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition duration-300"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <input
          type="text"
          placeholder="Target (optional)"
          className="border p-3 w-40 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition duration-300"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <button
          className="bg-indigo-500 text-white px-6 py-3 rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition duration-300"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
