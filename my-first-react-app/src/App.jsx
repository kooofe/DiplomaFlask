import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import Calendar from './Calendar';
import './App.css';

axios.defaults.withCredentials = true;

const socket = io('http://localhost:5000', { withCredentials: true });

const App = () => {
    const [messages, setMessages] = useState([]);
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState('');
    const [loggedIn, setLoggedIn] = useState(false);
    const [currentChat, setCurrentChat] = useState(null);
    const [chats, setChats] = useState([]);
    const [chatName, setChatName] = useState('');
    const [participants, setParticipants] = useState('');
    const [error, setError] = useState('');
    const [showPopup, setShowPopup] = useState(false);
    const [showAddUserPopup, setShowAddUserPopup] = useState(false);
    const [newParticipant, setNewParticipant] = useState('');
    const [showCreatePrivateChatPopup, setShowCreatePrivateChatPopup] = useState(false);
    const [privateChatParticipant, setPrivateChatParticipant] = useState('');
    const [users, setUsers] = useState([]);
    const [showCalendar, setShowCalendar] = useState(false); // Calendar state
    const chatWindowRef = useRef(null);

    useEffect(() => {
        if (loggedIn) {
            axios.get('http://localhost:5000/api/users')
                .then(response => setUsers(response.data))
                .catch(error => console.error('Error fetching users:', error));
        }
    }, [loggedIn]);

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
            socket.emit('message', { message, chat_id: currentChat.id }, (ack) => {
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

        const participantsList = participants.split(',').map(p => p.trim()).filter(p => p);
        participantsList.push(username);

        axios.post('http://localhost:5000/api/chats', {
            name: chatName,
            type: 'group',
            participants: participantsList
        })
            .then(response => {
                setChats([...chats, {
                    id: response.data.chat_id,
                    name: `${chatName} group`,
                    type: 'group',
                    participants: participantsList
                }]);
                setChatName('');
                setParticipants('');
                setError('');
                setShowPopup(false);
            })
            .catch(error => {
                setError('Error creating chat');
                console.error('Error creating chat:', error);
            });
    };

    const handleAddUserToChat = (e) => {
        e.preventDefault();
        if (!newParticipant.trim()) {
            setError('New participant username cannot be empty');
            return;
        }

        axios.post('http://localhost:5000/api/add_user_to_chat', {
            chat_id: currentChat.id,
            username: newParticipant
        })
            .then(() => {
                setCurrentChat({
                    ...currentChat,
                    participants: [...currentChat.participants, newParticipant]
                });
                setNewParticipant('');
                setError('');
                setShowAddUserPopup(false);
            })
            .catch(error => {
                setError('Error adding user to chat');
                console.error('Error adding user to chat:', error);
            });
    };

    const handleCreatePrivateChat = (e) => {
        e.preventDefault();
        if (!privateChatParticipant.trim()) {
            setError('Participant username cannot be empty');
            return;
        }

        axios.post('http://localhost:5000/api/create_private_chat', {
            participant: privateChatParticipant
        })
            .then(response => {
                setChats([...chats, {
                    id: response.data.chat_id,
                    name: privateChatParticipant,
                    type: 'private',
                    participants: [username, privateChatParticipant]
                }]);
                setPrivateChatParticipant('');
                setError('');
                setShowCreatePrivateChatPopup(false);
            })
            .catch(error => {
                setError('Error creating private chat');
                console.error('Error creating private chat:', error);
            });
    };

    const handleClearChat = () => {
        if (!currentChat) {
            setError('No chat selected');
            return;
        }

        axios.post('http://localhost:5000/api/clear_chat', {
            chat_id: currentChat.id
        })
            .then(() => {
                setMessages([]);
                setError('');
            })
            .catch(error => {
                setError('Error clearing chat');
                console.error('Error clearing chat:', error);
            });
    };

    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login setLoggedIn={setLoggedIn} setUsername={setUsername} />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={
                    loggedIn ? (
                        <div className="loggedIn">
                            <h1>Chat</h1>
                            <div id="chat-container">
                                <div id="chat-bar">
                                    {chats.map(chat => (
                                        <div key={chat.id} id="users-chat-bar">
                                            <a href="#" onClick={() => handleChatChange(chat)}>{chat.name}</a>
                                        </div>
                                    ))}
                                    <a href="#" onClick={() => setShowPopup(true)}>Create Group Chat</a>
                                    <a href="#" onClick={() => setShowCreatePrivateChatPopup(true)}>Create Private Chat</a>
                                    <a href="#" onClick={() => setShowCalendar(true)}>Open Calendar</a> {/* New button */}
                                    <a id="logout-btn" href="#" onClick={handleLogout}>Logout</a>
                                </div>
                                <div id="message-container">
                                    <ul id="messages" ref={chatWindowRef}>
                                        {messages.map((msg, index) => (
                                            <li key={index}><strong>{msg.sender}: </strong>{msg.message}</li>
                                        ))}
                                    </ul>
                                    <div id="input-container">
                                        {error && <p style={{ color: 'red' }}>{error}</p>}
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
                                        <button onClick={handleClearChat}>Clear Chat</button>
                                    </div>
                                </div>
                            </div>
                            {showPopup && (
                                <div className="popup">
                                    <div className="popup-inner">
                                        <h2>Create Group Chat</h2>
                                        <form onSubmit={handleCreateChat}>
                                            <input
                                                type="text"
                                                value={chatName}
                                                onChange={(e) => setChatName(e.target.value)}
                                                placeholder="Chat Name"
                                            />
                                            <input
                                                type="text"
                                                value={participants}
                                                onChange={(e) => setParticipants(e.target.value)}
                                                placeholder="Participants (comma separated)"
                                            />
                                            <button type="submit">Create</button>
                                        </form>
                                        <button onClick={() => setShowPopup(false)}>Close</button>
                                    </div>
                                </div>
                            )}
                            {showAddUserPopup && (
                                <div className="popup">
                                    <div className="popup-inner">
                                        <h2>Add User to Chat</h2>
                                        <form onSubmit={handleAddUserToChat}>
                                            <input
                                                type="text"
                                                value={newParticipant}
                                                onChange={(e) => setNewParticipant(e.target.value)}
                                                placeholder="New Participant Username"
                                            />
                                            <button type="submit">Add</button>
                                        </form>
                                        <button onClick={() => setShowAddUserPopup(false)}>Close</button>
                                    </div>
                                </div>
                            )}
                            {showCreatePrivateChatPopup && (
                                <div className="popup">
                                    <div className="popup-inner">
                                        <h2>Create Private Chat</h2>
                                        <form onSubmit={handleCreatePrivateChat}>
                                            <input
                                                type="text"
                                                value={privateChatParticipant}
                                                onChange={(e) => setPrivateChatParticipant(e.target.value)}
                                                placeholder="Participant Username"
                                            />
                                            <button type="submit">Create</button>
                                        </form>
                                        <button onClick={() => setShowCreatePrivateChatPopup(false)}>Close</button>
                                    </div>
                                </div>
                            )}
                            {showCalendar && (
                                <div className="popup">
                                    <div className="popup-inner">
                                        <h2>Calendar</h2>
                                        <Calendar />
                                        <button onClick={() => setShowCalendar(false)}>Close</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (

                        <div className="loggedOut">
                            <h2>Welcome to the Chat App</h2>
                            <div>
                                <Link to="/login">Login</Link> or <Link to="/register">Register</Link>
                            </div>
                        </div>)
                }/>
            </Routes>
        </Router>
    );
};

export default App;
