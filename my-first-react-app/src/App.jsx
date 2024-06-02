import React, {useState, useEffect} from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import {BrowserRouter as Router, Route, Routes, Link} from 'react-router-dom';
import Login from './Login.jsx';
import Register from './Register.jsx';
import './App.css';

axios.defaults.withCredentials = true;  // Ensure Axios sends credentials

const socket = io('http://localhost:5000', {withCredentials: true});

const App = () => {
    const [messages, setMessages] = useState([]);
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState('');
    const [loggedIn, setLoggedIn] = useState(false);

    useEffect(() => {
        if (loggedIn) {
            axios.get('http://localhost:5000/api/messages', {withCredentials: true})
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
        axios.post('http://localhost:5000/api/logout', {}, {withCredentials: true})
            .then(() => {
                setLoggedIn(false);
                setMessages([]);
            });
    };

    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login setLoggedIn={setLoggedIn}/>}/>
                <Route path="/register" element={<Register/>}/>
                <Route path="/" element={
                    loggedIn ? (
                        <div>
                            <div id="main-container">
                                <div id="navbar">
                                    <div>navbar-with-settings</div>
                                    <button onClick={handleLogout}>Logout</button>
                                </div>
                                <div id="user-profile">
                                    <img className="dialog-icon" src="assets/img.png" alt=""/>
                                    <div>
                                        <h1>My name is Anton</h1>
                                        <h2 id="status">online</h2>
                                    </div>
                                </div>
                                <div id="sidebar">
                                    <div className="chat-panel">
                                        <img className="dialog-icon" src="/my-first-react-app/src/assets/img.png" alt=""/>
                                        <h1>My name is Anton</h1>
                                    </div>
                                    <div className="chat-panel">
                                        <img className="dialog-icon" src="/my-first-react-app/src/assets/img.png" alt=""/>
                                        <h1>My name is Anton</h1>
                                    </div>
                                    <div className="chat-panel">
                                        <img className="dialog-icon" src="/my-first-react-app/src/assets/img.png" alt=""/>
                                        <h1>My name is Anton</h1>
                                    </div>
                                </div>
                                <div id="chat-window">
                                    <ul>
                                        {messages.map((msg, index) => (
                                            <li key={index}><strong>{msg.sender}: </strong>{msg.message}</li>
                                        ))}
                                    </ul>
                                    {/*<div id="message-window">*/}
                                    {/*    <div className="msg my-msg"></div>*/}
                                    {/*    <div className="msg received-msg"></div>*/}
                                    {/*    <div className="msg received-msg"></div>*/}
                                    {/*    <div className="msg my-msg"></div>*/}
                                    {/*</div>*/}
                                    <div className="message-input">
                                        <form onSubmit={handleSendMessage}>
                                            <input value={message} onChange={(e) => setMessage(e.target.value)}/>
                                            <button type="submit">Send</button>
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
                }/>
            </Routes>
        </Router>
    );
};

export default App;