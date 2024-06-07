from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from flask_session import Session
from werkzeug.security import generate_password_hash, check_password_hash
from cryptography.fernet import Fernet
import sqlite3

from Cryptodome.Cipher import AES, PKCS1_OAEP
from Cryptodome.PublicKey import RSA
from Cryptodome.Random import get_random_bytes

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key'
app.config['SESSION_TYPE'] = 'filesystem'
Session(app)
CORS(app, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*")

# Encryption setup
key = Fernet.generate_key()
cipher_suite = Fernet(key)


def generate_rsa_keypair():
    key = RSA.generate(2048)
    private_key = key.export_key()
    public_key = key.publickey().export_key()
    return private_key, public_key


def encrypt_with_rsa(public_key, plaintext):
    rsa_key = RSA.import_key(public_key)
    cipher_rsa = PKCS1_OAEP.new(rsa_key)
    return cipher_rsa.encrypt(plaintext)


def decrypt_with_rsa(private_key, ciphertext):
    rsa_key = RSA.import_key(private_key)
    cipher_rsa = PKCS1_OAEP.new(rsa_key)
    return cipher_rsa.decrypt(ciphertext)


def encrypt_with_aes(key, plaintext):
    cipher_aes = AES.new(key, AES.MODE_CBC)
    ciphertext = cipher_aes.iv + cipher_aes.encrypt(pad(plaintext))
    return ciphertext


def decrypt_with_aes(key, ciphertext):
    iv = ciphertext[:AES.block_size]
    cipher_aes = AES.new(key, AES.MODE_CBC, iv)
    plaintext = unpad(cipher_aes.decrypt(ciphertext[AES.block_size:]))
    return plaintext


def pad(s):
    padding_length = AES.block_size - len(s) % AES.block_size
    padding = bytes([padding_length]) * padding_length
    return s + padding


def unpad(s):
    padding_length = s[-1]
    return s[:-padding_length]


# Example usage
# Step 1: Key Generation
private_key, public_key = generate_rsa_keypair()

# Step 2: Key Exchange (Sender's Perspective)
aes_key = get_random_bytes(16)  # Generate a random AES key
encrypted_aes_key = encrypt_with_rsa(public_key, aes_key)

# Step 3: Data Encryption (Sender's Perspective)
plaintext = "Hello, World!"
encrypted_data = encrypt_with_aes(aes_key, plaintext.encode())

# Step 4: Data Decryption (Recipient's Perspective)
decrypted_aes_key = decrypt_with_rsa(private_key, encrypted_aes_key)
decrypted_data = decrypt_with_aes(decrypted_aes_key, encrypted_data).decode()

print("Decrypted Data:", decrypted_data)


def get_db_connection():
    conn = sqlite3.connect('users.db')
    conn.row_factory = sqlite3.Row
    return conn


def create_table():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS user (
                    id INTEGER PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL)''')
    c.execute('''CREATE TABLE IF NOT EXISTS message (
                    id INTEGER PRIMARY KEY,
                    sender TEXT NOT NULL,
                    receiver TEXT NOT NULL,
                    encrypted_content TEXT NOT NULL)''')
    c.execute('''CREATE TABLE IF NOT EXISTS login_attempts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()


create_table()


# Function to check login attempts
def check_login_attempts(username):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('''SELECT COUNT(*) as attempt_count
                 FROM login_attempts 
                 WHERE username = ? 
                 AND timestamp >= datetime('now', '-15 minutes')''', (username,))
    attempts = c.fetchone()['attempt_count']
    conn.close()
    return attempts


# Function to record login attempt
def record_login_attempt(username):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('INSERT INTO login_attempts (username) VALUES (?)', (username,))
    conn.commit()
    conn.close()


# Function to clear login attempts older than 15 minutes
def clear_old_attempts(username):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("DELETE FROM login_attempts WHERE username = ? AND timestamp < datetime('now', '-15 minutes')",
              (username,))
    conn.commit()
    conn.close()


@app.route('/api/messages', methods=['GET'])
def get_messages():
    if 'username' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    username = session['username']
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM message WHERE receiver = ? OR receiver = 'all'", (username,))
    messages = c.fetchall()
    conn.close()
    decrypted_messages = []
    for message in messages:
        try:
            decrypted_content = cipher_suite.decrypt(message['encrypted_content'].encode()).decode()
            decrypted_messages.append(
                {"sender": message['sender'], "receiver": message['receiver'], "message": decrypted_content})
        except Exception as e:
            print("Error decrypting message:", e)
    return jsonify(decrypted_messages)


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data['username']
    password = data['password']

    # Clear old attempts for the user
    clear_old_attempts(username)

    # Check the number of login attempts
    attempts = check_login_attempts(username)
    if attempts >= 3:
        return jsonify({"error": "Too many failed login attempts. Please try again after 15 minutes."}), 403

    # Verify user
    if verify_user(username, password):
        session['username'] = username
        return jsonify({"success": "Logged in"})
    else:
        record_login_attempt(username)
        return jsonify({"error": "Invalid username or password"}), 401


@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data['username']
    password = data['password']
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    elif user_exists(username):
        return jsonify({"error": "Username already exists"}), 409
    else:
        add_user(username, password)
        return jsonify({"success": "Registration successful"})


@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('username', None)
    return jsonify({"success": "Logged out"})


@app.route('/api/users', methods=['GET'])
def get_users():
    if 'username' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT username FROM user")
    users = c.fetchall()
    conn.close()
    return jsonify([user['username'] for user in users])


@socketio.on('connect')
def handle_connect():
    if 'username' in session:
        app.logger.debug(f"User {session['username']} connected.")
    else:
        app.logger.debug("Anonymous user connected.")


@socketio.on('message')
def handle_message(data):
    if 'username' not in session:
        app.logger.debug(f"Unauthorized message attempt. Session: {session}")
        return

    username = session['username']
    receiver = data.get('receiver', 'all')
    message_content = data.get('message')

    if receiver != 'all' and not user_exists(receiver):
        emit('message', {'sender': 'System', 'receiver': username, 'message': 'Receiver not found'}, room=request.sid)
        return

    encrypted_data = cipher_suite.encrypt(message_content.encode()).decode()
    insert_message(username, receiver, encrypted_data)
    emit('message', {'sender': username, 'receiver': receiver, 'message': message_content}, broadcast=True)


def insert_message(sender, receiver, encrypted_content):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("INSERT INTO message (sender, receiver, encrypted_content) VALUES (?, ?, ?)",
              (sender, receiver, encrypted_content))
    conn.commit()
    conn.close()


def verify_user(username, password):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT password FROM user WHERE username=?", (username,))
    user = c.fetchone()
    conn.close()
    if user and check_password_hash(user['password'], password):
        return True
    return False


def user_exists(username):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT username FROM user WHERE username=?", (username,))
    user = c.fetchone()
    conn.close()
    return user is not None


def add_user(username, password):
    hashed_password = generate_password_hash(password)
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("INSERT INTO user (username, password) VALUES (?, ?)", (username, hashed_password))
    conn.commit()
    conn.close()


if __name__ == '__main__':
    socketio.run(app, debug=True)
