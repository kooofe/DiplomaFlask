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
    const [currentRecipient, setCurrentRecipient] = useState('all');
    const [users, setUsers] = useState([]);
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

            axios.get('http://localhost:5000/api/users', { withCredentials: true })
                .then(response => {
                    setUsers(response.data);
                })
                .catch(error => {
                    console.error('There was an error fetching users!', error);
                });

            socket.on('message', (data) => {
                if (data.receiver === 'all' || data.receiver === username) {
                    setMessages(prevMessages => [...prevMessages, data]);
                }
            });

            return () => {
                socket.off('message');
            };
        }
    }, [loggedIn, username]);

    useEffect(() => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            socket.emit('message', { message, receiver: currentRecipient });
            setMessage('');
        }
    };

    const handleLogout = () => {
        axios.post('http://localhost:5000/api/logout', {}, { withCredentials: true })
            .then(() => {
                setLoggedIn(false);
                setMessages([]);
            });
    };

    const handleChatChange = (chatName) => {
        setCurrentRecipient(chatName);
    };

    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login setLoggedIn={setLoggedIn} setUsername={setUsername} />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={
                    loggedIn ? (
                        <div>
                            <h1>Chat</h1>
                            <div id="chat-container">
                                <div id="chat-bar">
                                    <a href="#" onClick={handleLogout}>Logout</a>
                                    {users.map(user => (
                                        <div key={user} name="user_select" id="users-chat-bar">
                                            <button onClick={() => handleChatChange(user)}>{user}</button>
                                        </div>
                                    ))}
                                </div>
                                <div id="message-container">
                                    <ul id="messages" ref={chatWindowRef}>
                                        {messages.map((msg, index) => (
                                            <li key={index}><strong>{msg.sender}: </strong>{msg.message}</li>
                                        ))}
                                    </ul>
                                    <div id="input-container">
                                        <form onSubmit={handleSendMessage}>
                                            <input
                                                id="myMessage"
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                placeholder="Type your message here"
                                                autoComplete="off"
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleSendMessage(e);
                                                    }
                                                }}
                                            />
                                            <button id="send" type="submit" disabled={!message.trim()}>Send</button>
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
