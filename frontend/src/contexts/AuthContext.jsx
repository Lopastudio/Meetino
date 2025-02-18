import { createContext, useState, useEffect } from "react";
import axios from "axios";
import PropTypes from "prop-types";

// Create context for authentication
export const AuthContext = createContext();

// AuthProvider component to manage user login state
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));

  // When token changes, check if it's valid and fetch user info
  useEffect(() => {
    if (token) {
      axios
        .get("http://localhost:3010/auth", { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => setUser(res.data.user)) // Update user state with response data
        .catch((err) => {
          console.error("Token invalid or expired:", err);
          setToken(null); // If the token is invalid, reset the token state
          localStorage.removeItem("token"); // Optionally remove invalid token from localStorage
        });
    } else {
      setUser(null); // No token, user is logged out
    }
  }, [token]);

  // Login function to authenticate user and store token
  const login = async (username, password) => {
    try {
      const res = await axios.post("http://localhost:3010/login", { username, password });
      const newToken = res.data.token;
      localStorage.setItem("token", newToken); // Store token in localStorage
      setToken(newToken); // Set token in state
      setUser({ username }); // Update user state (you can also store additional user data from the backend)
    } catch (error) {
      console.error("Login error:", error);
  };
  
  AuthProvider.propTypes = {
    children: PropTypes.node.isRequired,
  };
  };

  // Logout function to clear token and user data
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null); // Reset token state
    setUser(null); // Reset user state
  };

  // Providing context values
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
