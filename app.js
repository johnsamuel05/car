const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const transporter = require('./mailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT;
const JWT_SECRET = process.env.JWT_SECRET;
const USERS_FILE = path.join(__dirname, 'users.json');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const getUsers = () => {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading users.json:", err.message);
        return [];
    }
};

const saveUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

app.get('/', (req, res) => {
    console.log("Redirecting to login page...");
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    console.log("Rendering login page...");
    res.render('pages/login', { title: "Login", error: null });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log("Login attempt with data:", req.body);

    const users = getUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
        console.log("Invalid username:", username);
        return res.render('pages/login', { title: "Login", error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        console.log("Invalid password for user:", username);
        return res.render('pages/login', { title: "Login", error: "Invalid credentials" });
    }

    const token = jwt.sign({ username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '1m' });
    console.log("Login successful. Generated JWT token:", token);

    res.cookie('token', token, { httpOnly: true });
    res.redirect('/home');
});

app.get('/register', (req, res) => {
    console.log("Rendering register page...");
    res.render('pages/register', { title: "Register", error: null });
});

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    console.log("Registration attempt with data:", req.body);

    const users = getUsers();

    const existingUser = users.find(u => u.username === username || u.email === email);
    if (existingUser) {
        console.log("User already exists:", existingUser);
        return res.render('pages/register', { title: "Register", error: "Username or email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, email, password: hashedPassword });
    saveUsers(users);
    //const user=[]

    console.log("User registered successfully:", { username, email });
    res.redirect('/login');
});

app.get('/home', (req, res) => {
    const token = req.cookies.token;
    console.log("Checking token for access to home page...");

    if (!token) {
        console.log("No token found, redirecting to login...");
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log("Token verified. Decoded user data:", decoded);
        res.render('pages/home', { title: "Home", user: decoded.username });
    } catch (err) {
        console.error("Token invalid:", err.message);
        res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    console.log("Logging out and clearing token...");
    res.clearCookie('token');
    res.redirect('/login');
});

app.get('/about', (req, res) => {
    console.log("Rendering about page...");
    res.render('pages/about', { title: "About Us" });
});

app.get('/contact', (req, res) => {
    console.log("Rendering contact page...");
    res.render('pages/contact', { title: "Contact" });
});

app.get('/forgot-password', (req, res) => {
    res.render('pages/forgot-password', { title: "Forgot Password", message: null, error: null });
});

app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const users = getUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        return res.render('pages/forgot-password', { title: "Forgot Password", error: "Email not found", message: null });
    }

    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '10m' });
    const resetLink = `http://localhost:${PORT}/reset-password?token=${token}`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset - Self Rental Cars',
        text: `You requested a password reset. Click this link to reset your password: ${resetLink}`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Password reset email sent to:", email);
        res.render('pages/forgot-password', { title: "Forgot Password", message: "Reset link sent to your email", error: null });
    } catch (err) {
        console.error("Failed to send reset email:", err.message);
        res.render('pages/forgot-password', { title: "Forgot Password", message: null, error: "Failed to send email" });
    }
});

app.get('/reset-password', (req, res) => {
    const { token } = req.query;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.render('pages/reset-password', { title: "Reset Password", email: decoded.email, token, error: null });
    } catch (err) {
        res.send("Invalid or expired token.");
    }
});

app.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const users = getUsers();
        const userIndex = users.findIndex(u => u.email === decoded.email);

        if (userIndex === -1) {
            return res.send("User not found.");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        users[userIndex].password = hashedPassword;
        saveUsers(users);

        res.send("Password reset successful. <a href='/login'>Login now</a>");
    } catch (err) {
        res.send("Invalid or expired token.");
    }
});


app.listen(PORT, () => {
    console.log(`🚗 Self Rental Cars app running at http://localhost:${PORT}`);
});
