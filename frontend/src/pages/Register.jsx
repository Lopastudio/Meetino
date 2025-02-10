import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Register = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    try {
      const res = await axios.post("http://localhost:3010/register", {
        email,
        username,
        password,
        favorites: JSON.stringify([]), // Default empty array for favorites
      });

      localStorage.setItem("token", res.data.token);
      navigate("/login");
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.error || "Registration failed");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gradient-to-r from-blue-200 to-blue-500">
      <form onSubmit={handleRegister} className="bg-white p-8 rounded-lg shadow-xl w-96 max-w-md">
        <h2 className="text-3xl font-semibold text-center text-gray-700 mb-6">Create an Account</h2>
        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
        
        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        
        <input
          type="text"
          placeholder="Username"
          className="w-full p-3 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        
        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        
        <input
          type="password"
          placeholder="Confirm Password"
          className="w-full p-3 border border-gray-300 rounded-md mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        
        <button className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200">
          Register
        </button>
        
        <p className="text-sm text-center mt-4 text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="text-blue-500 hover:text-blue-600 transition">
            Login here
          </a>
        </p>
      </form>
    </div>
  );
};

export default Register;
