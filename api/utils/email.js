const nodemailer = require("nodemailer");
require("dotenv").config(); // Ensure dotenv loads environment variables

// Create Transporter
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",  // Explicitly set SMTP host
    port: 465,               // Use 465 for SSL (or 587 for STARTTLS)
    secure: true,            // True for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});



// Debugging - Ensure credentials are loaded
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {

    console.error("⚠️ Missing EMAIL_USER or EMAIL_PASS in environment variables.");
}

// Email Template Function
const generateEmailTemplate = (studentName) => {
    return `
        <h2>Hello ${studentName},</h2>
        <p>Welcome to Cavite State University - Tanza Campus! We are glad to have you.</p>
        <p>You may now proceed to the school and register for your courses.</p>
        <p>Please note that you will need to provide your student account to access your courses.</p>
        <br>
        <p>Best Regards,</p>
        <p>Your Organization Team</p>
    `;
};

// Export Transporter & Template
module.exports = {
    transporter,
    generateEmailTemplate,
};
