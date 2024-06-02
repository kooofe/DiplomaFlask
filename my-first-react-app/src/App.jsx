import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Login from './Login.jsx';
import Register from './Register.jsx';
import './App.css';

axios.defaults.withCredentials = true;

const socket = io('http://localhost:5000', { withCredentials: true });

const App = () => {
    const [messages, setMessages] = useState([]);
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState('');
    const [loggedIn, setLoggedIn] = useState(false);
    const [currentChat, setCurrentChat] = useState('Global Chat');
    const chatWindowRef = useRef(null);

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

    useEffect(() => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    }, [messages]);

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

    const handleChatChange = (chatName) => {
        setCurrentChat(chatName);
    };

    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login setLoggedIn={setLoggedIn} />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={
                    loggedIn ? (
                        <div>
                            <div id="main-container">
                                <div id="navbar">
                                    <div>navbar-with-settings</div>
                                    <button onClick={handleLogout}>Logout</button>
                                </div>
                                <div id="user-profile">
                                    <img className="dialog-icon" src="assets/img.png" alt="" />
                                    <div>
                                        <h1>{currentChat}</h1>
                                        {/*<h2 id="status">online</h2>*/}
                                    </div>
                                </div>
                                <div id="sidebar">
                                    <div className="chat-panel" onClick={() => handleChatChange('Global Chat')}>
                                        <img className="dialog-icon" src="/assets/img.png" alt="Global" />
                                        <h1>Global Chat</h1>
                                    </div>
                                </div>
                                <div id="chat-window" ref={chatWindowRef}>
                                    {messages.map((msg, index) => (
                                        <div key={index} className={`message ${msg.sender === username ? 'my-message' : 'received-message'}`}>
                                            <strong>{msg.sender}: </strong>{msg.message}
                                        </div>
                                    ))}
                                    <div className="message-input">
                                        <form onSubmit={handleSendMessage}>
                                            <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." />
                                            <button type="submit" disabled={!message.trim()}>Send</button>
                                        </form>
                                    </div>
                                </div>
                            </div>
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
