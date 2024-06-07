import React, {useState} from 'react';
import axios from 'axios';
import {useNavigate} from 'react-router-dom';

const Login = ({setLoggedIn}) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        axios.post('http://localhost:5000/api/login', {username, password})
            .then(response => {
                setLoggedIn(true);
                navigate('/');
            })
            .catch(error => {
                if (error.response.status === 403) {
                    setError('Too much attempts. Try again in 15 minutes');
                } else if (error.response.status === 401) {
                    setError(error.response.data.error);
                } else {
                    setError('An unexpected error occurred. Please try again.');
                }
            });
    };

    return (
        <div>
            <h2>Login</h2>
            {error && <p style={{color: 'red'}}>{error}</p>}
            {error}
            <form onSubmit={handleLogin}>
                <label>
                    Username:
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}/>
                </label>
                <label>
                    Password:
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}/>
                </label>
                <button type="submit">Login</button>
            </form>
            <p>Don't have an account? <a href="/register">Register</a></p>
        </div>
    );
};

export default Login;
