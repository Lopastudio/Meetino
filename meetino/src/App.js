import React from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import ChatRoom from './components/ChatRoom';
import RoomList from './components/RoomList';

// Tu treba dať preč router

function App() {
  return (
    <Router>
      <div className="container mx-auto p-4">
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/chat" component={RoomList} />
          <Route path="/room/:room" component={ChatRoom} />
      </div>
    </Router>
  );
}

export default App;
