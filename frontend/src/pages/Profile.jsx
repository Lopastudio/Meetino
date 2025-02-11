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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [messages, setMessages] = useState([]); // State to hold messages

  useEffect(() => {
    if (user) {
      // Fetch initial profile data
      axios
        .get("http://localhost:3010/profile", {
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

      // Set the username for socket communication
      socket.emit("set-username", user?.username);

      // Load messages from localStorage if available
      const cachedMessages = localStorage.getItem("messages");
      if (cachedMessages) {
        setMessages(JSON.parse(cachedMessages)); // Load cached messages into state
      }

      // Listen for new messages from the server
      socket.on("msg-event", (message) => {
        console.log("New message received:", message);

        // Update state and cache the new message
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages, message];
          localStorage.setItem("messages", JSON.stringify(updatedMessages)); // Cache messages
          return updatedMessages;
        });
      });

      // Listen for previous messages from the server
      socket.on("previous-messages", (messages) => {
        setMessages(messages);
        localStorage.setItem("messages", JSON.stringify(messages)); // Cache previous messages
      });
    }

    // Cleanup on unmount
    return () => {
      socket.off("msg-event");
      socket.off("previous-messages");
    };
  }, [user]); // Ensure this runs when the user changes

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found!");
        return;
      }

      const response = await axios.put(
        "http://localhost:3010/profile",
        {
          bio: profile.bio,
          profile_picture_url: profile.profile_picture_url,
          favorites: profile.favorites,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const addFriend = () => {
    if (!friendUsername) {
      console.error("Please enter a friend's username.");
      return;
    }

    axios
      .put(
        "http://localhost:3010/add-friend",
        { friendUsername },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      )
      .then((response) => {
        const updatedFavorites = [...profile.favorites, friendUsername];
        setProfile((prevProfile) => ({
          ...prevProfile,
          favorites: updatedFavorites,
        }));
        setFriendUsername("");
      })
      .catch((error) => {
        console.error("Error adding friend:", error);
      });
  };

  const handleSearchChange = (e) => {
    const { value } = e.target;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const searchUsers = (query) => {
    if (query.trim() === "") return;

    axios
      .get(`http://localhost:3010/search-users?query=${query}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((response) => {
        setSearchResults(response.data);
      })
      .catch((error) => {
        console.error("Error searching for users:", error);
      });
  };

  const debouncedSearch = debounce((query) => searchUsers(query), 500);

  if (!user) return <p className="text-center mt-4 text-gray-600">Please log in to view your profile.</p>;

  return (
    <div className="container mx-auto mt-8 p-6 bg-gradient-to-r from-blue-100 via-purple-100 to-indigo-200 rounded-lg shadow-xl">
      <h2 className="text-3xl font-semibold text-center text-indigo-700 mb-6">Your Profile</h2>
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

      {editing ? (
        <div className="mt-6">
          <textarea
            name="bio"
            value={profile.bio}
            onChange={handleChange}
            className="w-full p-3 rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            placeholder="Write your bio..."
          />
          <input
            type="text"
            name="profile_picture_url"
            value={profile.profile_picture_url}
            onChange={handleChange}
            className="w-full p-3 rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            placeholder="Profile Picture URL"
          />
          <div className="flex justify-center mb-4">
            <button
              onClick={handleSave}
              className="bg-indigo-600 text-white py-2 px-6 rounded-full hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Save Changes
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-lg font-medium">Bio:</p>
          <p className="text-gray-600">{profile.bio || "No bio available."}</p>
          
          <div className="mt-4">
            <p className="text-lg font-medium">Friends:</p>
            {profile.favorites.length > 0 ? (
              <div className="space-y-2">
                {profile.favorites.map((friend, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white shadow-lg rounded-lg mb-2">
                    <p className="text-gray-600">{friend}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No friends yet.</p>
            )}
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setEditing(true)}
              className="bg-yellow-500 text-white py-2 px-6 rounded-full hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              Edit Profile
            </button>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-xl font-medium mb-2">Search Users</h3>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search for users..."
          className="border p-3 rounded-lg w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {searchResults.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium">Search Results</h3>
          <div className="space-y-4">
            {searchResults.map((user, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white shadow-lg rounded-lg mb-2">
                <p className="text-gray-600">{user.username}</p>
                <button
                  onClick={() => setFriendUsername(user.username)}
                  className="bg-green-500 text-white py-2 px-6 rounded-full hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Add as Friend
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
