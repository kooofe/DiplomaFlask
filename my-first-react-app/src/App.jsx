import React, {useState, useEffect, useRef} from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import {BrowserRouter as Router, Route, Routes, Link} from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import './App.css';

axios.defaults.withCredentials = true;

const socket = io('http://localhost:5000', {withCredentials: true});

const App = () => {
    const [messages, setMessages] = useState([]);
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState('');
    const [loggedIn, setLoggedIn] = useState(false);
    const [currentChat, setCurrentChat] = useState(null);
    const [chats, setChats] = useState([]);
    const [chatName, setChatName] = useState('');
    const [error, setError] = useState('');
    const chatWindowRef = useRef(null);

    useEffect(() => {
        if (loggedIn) {
            axios.get('http://localhost:5000/api/chats')
                .then(response => {
                    setChats(response.data);
                    const globalChat = response.data.find(chat => chat.type === 'global');
                    setCurrentChat(globalChat);
                })
                .catch(error => console.error('Error fetching chats:', error));
        }
    }, [loggedIn]);

    useEffect(() => {
        if (currentChat) {
            axios.get(`http://localhost:5000/api/messages?chat_id=${currentChat.id}`)
                .then(response => setMessages(response.data))
                .catch(error => console.error('Error fetching messages:', error));
        }
    }, [currentChat]);

    useEffect(() => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (loggedIn) {
            socket.on('connect', () => {
                console.log('Socket connected');
            });

            socket.on('disconnect', () => {
                console.log('Socket disconnected');
            });

            socket.on('message', (data) => {
                if (data.chat_id === currentChat?.id) {
                    setMessages(prevMessages => [...prevMessages, data]);
                }
            });

            return () => {
                socket.off('connect');
                socket.off('disconnect');
                socket.off('message');
            };
        }
    }, [loggedIn, currentChat]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!currentChat) {
            setError('No chat selected');
            return;
        }
        if (message.trim()) {
            socket.emit('message', {message, chat_id: currentChat.id}, (ack) => {
                if (ack && ack.error) {
                    setError(ack.error);
                } else {
                    setMessage('');
                    setError('');
                }
            });
        }
    };

    const handleLogout = () => {
        axios.post('http://localhost:5000/api/logout')
            .then(() => {
                setLoggedIn(false);
                setMessages([]);
                setCurrentChat(null);
            })
            .catch(error => console.error('Error logging out:', error));
    };

    const handleChatChange = (chat) => setCurrentChat(chat);

    const handleCreateChat = (e) => {
        e.preventDefault();
        if (!chatName.trim()) {
            setError('Chat name cannot be empty');
            return;
        }
        axios.post('http://localhost:5000/api/chats', {name: chatName, type: 'private', participants: [username]})
            .then(response => {
                setChats([...chats, {
                    id: response.data.chat_id,
                    name: chatName,
                    type: 'private',
                    participants: [username]
                }]);
                setChatName('');
                setError('');
            })
            .catch(error => {
                setError('Error creating chat');
                console.error('Error creating chat:', error);
            });
    };

    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login setLoggedIn={setLoggedIn} setUsername={setUsername}/>}/>
                <Route path="/register" element={<Register/>}/>
                <Route path="/" element={
                    loggedIn ? (
                        <div>
                            <h1>Chat</h1>
                            <div id="chat-container">
                                <div id="chat-bar">
                                    {chats.map(chat => (
                                        <div key={chat.id} id="users-chat-bar">
                                            <a href="#" onClick={() => handleChatChange(chat)}>{chat.name}</a>
                                        </div>
                                    ))}
                                    <a href="#" onClick={handleLogout}>Logout</a>
                                    <form onSubmit={handleCreateChat}>
                                        <input
                                            value={chatName}
                                            onChange={(e) => setChatName(e.target.value)}
                                            placeholder="New chat name"
                                            autoComplete="off"
                                        />
                                        <button type="submit">Create Chat</button>
                                    </form>

                                </div>
                                <div id="message-container">
                                <ul id="messages" ref={chatWindowRef}>
                                        {messages.map((msg, index) => (
                                            <li key={index}><strong>{msg.sender}: </strong>{msg.message}</li>
                                        ))}
                                    </ul>
                                    <div id="input-container">
                                        {error && <p style={{color: 'red'}}>{error}</p>}
                                        <form onSubmit={handleSendMessage}>
                                            <input
                                                id="myMessage"
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                placeholder="Type your message here"
                                                autoComplete="off"
                                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e)}
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
                }/>
            </Routes>
        </Router>
    );
};

export default App;
