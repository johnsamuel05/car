// mailer.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,     // smtp-relay.brevo.com
    port: process.env.EMAIL_PORT,     // 587
    secure: false,                    // Use true if port is 465
    auth: {
        user: process.env.EMAIL_USER, // 87fc6f001@smtp-brevo.com
        pass: process.env.EMAIL_PASS  // your SMTP password
    }
});

module.exports = transporter;
