/* eslint-disable no-unused-vars */
import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import axios from "axios";
import io from "socket.io-client";
import { debounce } from "lodash";

const socket = io("http://localhost:3010");

const Profile = () => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState({
    bio: "",
    profile_picture_url: "",
    favorites: [],
  });
  const [editing, setEditing] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [friendRequests, setFriendRequests] = useState([]);

  useEffect(() => {
    if (user) {
      axios
        .get("http://localhost:3010/profile", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .then((response) => setProfile(response.data))
        .catch((error) => console.error("Error fetching profile:", error));

      axios
        .get("http://localhost:3010/get-friend-requests", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .then((response) => setFriendRequests(response.data))
        .catch((error) => console.error("Error fetching friend requests:", error));
    }
  }, [user]);

  const handleSave = async () => {
    try {
      await axios.put(
        "http://localhost:3010/profile",
        profile,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const sendFriendRequest = () => {
    if (!friendUsername) return;

    axios
      .post(
        "http://localhost:3010/send-friend-request",
        { friendUsername },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      )
      .then(() => setFriendUsername(""))
      .catch((error) => console.error("Error sending friend request:", error));
  };

  const acceptFriendRequest = (senderUsername) => {
    axios
      .post(
        "http://localhost:3010/accept-friend-request",
        { senderUsername },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      )
      .then(() => setFriendRequests(friendRequests.filter(req => req.sender !== senderUsername)))
      .catch((error) => console.error("Error accepting friend request:", error));
  };

  if (!user) return <p>Please log in to view your profile.</p>;

  return (
    <div className="container mx-auto p-6 bg-gray-100 rounded-lg shadow-lg">
      <h2 className="text-3xl font-semibold text-center">Your Profile</h2>
      <div className="flex justify-center mt-6">
        {profile.profile_picture_url ? (
          <img src={profile.profile_picture_url} alt="Profile" className="w-32 h-32 rounded-full shadow-lg" />
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold">
            No Image
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-6">
          <textarea name="bio" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} className="w-full p-3 border rounded-lg" />
          <button onClick={handleSave} className="bg-blue-600 text-white py-2 px-6 rounded-lg mt-4">Save Changes</button>
        </div>
      ) : (
        <div>
          <p className="text-lg font-medium">Bio:</p>
          <p>{profile.bio || "No bio available."}</p>
          <button onClick={() => setEditing(true)} className="bg-yellow-500 text-white py-2 px-6 rounded-lg mt-4">Edit Profile</button>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-xl font-medium">Send Friend Request</h3>
        <input type="text" value={friendUsername} onChange={(e) => setFriendUsername(e.target.value)} className="border p-2 rounded-lg w-full" />
        <button onClick={sendFriendRequest} className="bg-green-500 text-white py-2 px-6 rounded-lg mt-2">Send Request</button>
      </div>

      <div className="mt-6">
        <h3 className="text-xl font-medium">Pending Friend Requests</h3>
        {friendRequests.length > 0 ? (
          friendRequests.map((request, index) => (
            <div key={index} className="flex justify-between p-3 bg-white shadow-lg rounded-lg mb-2">
              <p>{request.sender}</p>
              <button onClick={() => acceptFriendRequest(request.sender)} className="bg-blue-500 text-white py-2 px-4 rounded-lg">Accept</button>
            </div>
          ))
        ) : (
          <p>No pending friend requests.</p>
        )}
      </div>
    </div>
  );
};

export default Profile;
