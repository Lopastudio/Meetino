import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import ProfileView from "./pages/ProfileView";
import Home from "./pages/Home";
import { useContext, useState } from "react";
import { AuthContext } from "./contexts/AuthContext";
import { FaBars, FaTimes } from "react-icons/fa";

function App() {
  const { user, logout } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen((prevState) => !prevState);

  return (
    <Router>
      <nav className="bg-indigo-600 text-white p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="text-3xl font-bold hover:text-indigo-300 transition duration-300"
          >
            Meetino
          </Link>
          <div className="hidden md:flex space-x-6">
            <Link
              to="/chat"
              className="hover:text-indigo-300 transition duration-300"
            >
              Chat
            </Link>
            <Link
              to="/profile"
              className="hover:text-indigo-300 transition duration-300"
            >
              Your profile
            </Link>
            {!user && (
              <Link
                to="/register"
                className="hover:text-indigo-300 transition duration-300"
              >
                Register
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {user ? (
            <>
              <span className="text-white">Hello, {user.username}</span>
              <Link
                to="/profile"
                className="hover:text-indigo-300 transition duration-300"
              >
                Profile
              </Link>
              <button
                onClick={logout}
                className="bg-red-600 py-2 px-4 rounded-full text-white hover:bg-red-700 focus:outline-none transition duration-300"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hover:text-indigo-300 transition duration-300"
              >
                Login
              </Link>
            </>
          )}

          {/* Hamburger Menu for Mobile */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-white p-2 hover:bg-indigo-700 rounded-lg"
            >
              {menuOpen ? (
                <FaTimes className="text-2xl" />
              ) : (
                <FaBars className="text-2xl" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {menuOpen && (
        <div className="md:hidden bg-indigo-700 text-white p-4 absolute top-0 right-0 left-0 z-50">
          <div className="flex flex-col space-y-4">
            <Link
              to="/chat"
              onClick={toggleMenu}
              className="hover:text-indigo-300 transition duration-300"
            >
              Chat
            </Link>
            {!user && (
              <Link
                to="/register"
                onClick={toggleMenu}
                className="hover:text-indigo-300 transition duration-300"
              >
                Register
              </Link>
            )}
            {user && (
              <>
                <Link
                  to="/profile"
                  onClick={toggleMenu}
                  className="hover:text-indigo-300 transition duration-300"
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    logout();
                    toggleMenu();
                  }}
                  className="bg-red-600 py-2 px-4 rounded-full text-white hover:bg-red-700 focus:outline-none transition duration-300"
                >
                  Logout
                </button>
              </>
            )}
            {!user && (
              <Link
                to="/login"
                onClick={toggleMenu}
                className="hover:text-indigo-300 transition duration-300"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:id" element={<ProfileView />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </Router>
  );
}

export default App;
