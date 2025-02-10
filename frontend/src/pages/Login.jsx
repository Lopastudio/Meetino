import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

const Login = () => {
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null); // Error state for handling login errors
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError("Invalid username or password.");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-xl w-80">
        <h2 className="text-2xl font-semibold text-center text-indigo-700 mb-6">Login</h2>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>} {/* Error message */}

        <input
          type="text"
          placeholder="Username"
          className="w-full p-3 border rounded-lg mb-4 shadow-sm focus:ring-2 focus:ring-indigo-500"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        
        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 border rounded-lg mb-6 shadow-sm focus:ring-2 focus:ring-indigo-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300"
        >
          Login
        </button>

        <p className="text-sm mt-4 text-center">
          Don't have an account?{" "}
          <a href="/register" className="text-blue-500 hover:text-blue-600">
            Register here
          </a>
        </p>
      </form>
    </div>
  );
};

export default Login;
