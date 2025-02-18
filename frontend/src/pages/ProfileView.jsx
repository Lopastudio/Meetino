/* eslint-disable no-unused-vars */

import { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import axios from "axios";
import io from "socket.io-client";

const socket = io("http://localhost:3010");

const ProfileView = () => {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const [profile, setProfile] = useState({
    username: "",
    bio: "",
    profile_picture_url: "",
    favorites: [],
  });
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (user) {
      axios
        .get(`http://localhost:3010/profile/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })
        .then((response) => {
          setProfile(response.data);
        })
        .catch((error) => {
          console.error("Error fetching profile:", error);
        });

      socket.emit("set-username", user?.username);
      const cachedMessages = localStorage.getItem("messages");
      if (cachedMessages) {
        setMessages(JSON.parse(cachedMessages));
      }

      socket.on("msg-event", (message) => {
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages, message];
          localStorage.setItem("messages", JSON.stringify(updatedMessages));
          return updatedMessages;
        });
      });

      socket.on("previous-messages", (messages) => {
        setMessages(messages);
        localStorage.setItem("messages", JSON.stringify(messages));
      });
    }

    return () => {
      socket.off("msg-event");
      socket.off("previous-messages");
    };
  }, [user, id]);

  if (!user)
    return (
      <p className="text-center mt-4 text-gray-600">
        Please log in to view profiles.
      </p>
    );

  return (
    <div className="container mx-auto mt-8 p-6 bg-gradient-to-r from-blue-100 via-purple-100 to-indigo-200 rounded-lg shadow-xl">
      <h2 className="text-3xl font-semibold text-center text-indigo-700 mb-6">
        {profile.username}&apos;s Profile
      </h2>
      <div className="flex justify-center mt-6">
        <div className="relative">
          {profile.profile_picture_url ? (
            <img
              src={profile.profile_picture_url}
              alt="Profile"
              className="w-32 h-32 rounded-full shadow-lg transform hover:scale-110 transition duration-300"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-500">
              No Image
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-white rounded-lg shadow-lg">
        <p className="text-lg font-medium text-gray-800">Bio:</p>
        <p className="text-gray-600">{profile.bio || "No bio available."}</p>
      </div>

      <div className="mt-6 p-4 bg-white rounded-lg shadow-lg">
        <p className="text-lg font-medium text-gray-800">Friends:</p>
        {profile.favorites.length > 0 ? (
          <div className="space-y-2">
            {profile.favorites.map((friend, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-100 shadow-md rounded-lg"
              >
                <p className="text-gray-700 font-medium">{friend}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No friends yet.</p>
        )}
      </div>
    </div>
  );
};

export default ProfileView;
