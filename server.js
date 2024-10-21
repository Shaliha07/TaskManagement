const express = require('express');
const jwt = require('jsonwebtoken');
const Task = require('./models/Task');
const User = require('./models/user');
const taskValidation = require('./validation');
const { verifyAdmin, verifyToken } = require('./authMiddleware');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Middleware for error handling
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
};

// GET tasks for the logged-in user
app.get('/tasks', verifyToken, async (req, res) => {
    try {
        const tasks = await Task.find({ user: req.user.id });
        res.json(tasks);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// POST route for creating a task (protected)
app.post('/tasks', verifyToken, async (req, res) => {
    const { error } = taskValidation(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const task = new Task({
        name: req.body.name,
        completed: req.body.completed || false,
        user: req.user.id // Associate the task with the logged-in user
    });

    try {
        const newTask = await task.save();
        res.status(201).json(newTask);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE task for the logged-in user
app.delete('/tasks/:id', verifyToken, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        await task.remove();
        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// GET all tasks for admin
app.get('/admin/tasks', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const tasks = await Task.find();
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST route for user registration
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already in use' });

    const user = new User({ username, email, password });

    try {
        const savedUser = await user.save();
        const token = jwt.sign({ id: savedUser._id }, 'your_jwt_secret_key', { expiresIn: '1h' });
        res.status(201).json({ token });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// POST route for user login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, 'your_jwt_secret_key', { expiresIn: '1h' });
    res.json({ token });
});

// POST route for admin registration
app.post('/register-admin', async (req, res) => {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already in use' });

    const user = new User({ username, email, password, role: 'admin' });

    try {
        const savedUser = await user.save();
        const token = jwt.sign({ id: savedUser._id, role: savedUser.role }, 'your_jwt_secret_key', { expiresIn: '1h' });
        res.status(201).json({ token });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Password reset functionalities
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'your_email@gmail.com',
            pass: 'your_password'
        }
    });

    const mailOptions = {
        to: user.email,
        from: 'passwordreset@yourapp.com',
        subject: 'Password Reset',
        text: `You are receiving this because you (or someone else) have requested a password reset for your account.\n\n
        Please click on the following link, or paste it into your browser to complete the process within one hour of receiving it:\n\n
        http://localhost:3000/reset-password/${token}\n\n
        If you did not request this, please ignore this email and your password will remain unchanged.\n`
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) return res.status(500).json({ message: 'Error sending email' });
        res.status(200).json({ message: 'Password reset link sent' });
    });
});

app.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }  // Token not expired
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
    res.status(200).json({ message: 'Password successfully reset' });
});

// Start the server
const PORT = process.env.PORT || 3000; // You can use any port number, 3000 is common

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Error-handling middleware
app.use(errorHandler);
