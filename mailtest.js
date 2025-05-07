const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

transporter.sendMail({
    from: `"Test Mail" <${process.env.EMAIL_USER}>`,
    to: "ping.johnsamuel@gmail.com",
    subject: "Test Mail from Node",
    text: "If you're seeing this, it worked!",
}, (err, info) => {
    if (err) {
        console.error("Error:", err);
    } else {
        console.log("Success:", info);
    }
});
