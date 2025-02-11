import { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

const Home = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="container mx-auto mt-10 p-6 bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 rounded-lg shadow-lg">
      <h1 className="text-4xl font-bold text-center text-indigo-700 mb-6">Welcome to Meetino</h1>
      <p className="text-center text-gray-700 mb-8">
        bla bla bla nechce sa mi zatiaľ vymyšľať Lorem ipsum dolor sit amet consectetur adipisicing elit. Sint pariatur delectus beatae accusantium eveniet aliquid est hic voluptas quae corporis, reiciendis harum quam voluptatibus sed fugit earum dolor maxime dolore.
      </p>
      <div className="flex justify-center space-x-6">
        <Link
          to="/chat"
          className="bg-indigo-500 text-white px-6 py-3 rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition duration-300"
        >
          Chat
        </Link>
        {user ? (
          <>
            <Link
              to="/profile"
              className="bg-indigo-500 text-white px-6 py-3 rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition duration-300"
            >
              Your Profile
            </Link>
            <button
              onClick={logout}
              className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 transition duration-300"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="bg-indigo-500 text-white px-6 py-3 rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition duration-300"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="bg-indigo-500 text-white px-6 py-3 rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition duration-300"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;