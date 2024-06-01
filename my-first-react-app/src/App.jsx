import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Login from './Login.jsx';
import Register from './Register.jsx';

axios.defaults.withCredentials = true;  // Ensure Axios sends credentials

const socket = io('http://localhost:5000', { withCredentials: true });

const App = () => {
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (loggedIn) {
      axios.get('http://localhost:5000/api/messages', { withCredentials: true })
        .then(response => {
          setMessages(response.data);
        })
        .catch(error => {
          console.error('There was an error fetching messages!', error);
        });

      socket.on('message', (data) => {
        setMessages(prevMessages => [...prevMessages, data]);
      });

      return () => {
        socket.off('message');
      };
    }
  }, [loggedIn]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    socket.emit('message', message);
    setMessage('');
  };

  const handleLogout = () => {
    axios.post('http://localhost:5000/api/logout', {}, { withCredentials: true })
      .then(() => {
        setLoggedIn(false);
        setMessages([]);
      });
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login setLoggedIn={setLoggedIn} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={
          loggedIn ? (
            <div>
              <h1>Chat</h1>
              <ul>
                {messages.map((msg, index) => (
                  <li key={index}><strong>{msg.sender}: </strong>{msg.message}</li>
                ))}
              </ul>
              <form onSubmit={handleSendMessage}>
                <input value={message} onChange={(e) => setMessage(e.target.value)} />
                <button type="submit">Send</button>
              </form>
              <button onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <div>
              <h2>Welcome to the Chat App</h2>
              <Link to="/login">Login</Link> or <Link to="/register">Register</Link>
            </div>
          )
        } />
      </Routes>
    </Router>
  );
};

export default App;