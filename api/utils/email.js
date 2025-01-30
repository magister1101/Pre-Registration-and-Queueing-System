const nodemailer = require("nodemailer");
dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Email Template Function
const generateEmailTemplate = (studentName) => {
    return `
        <h2>Hello ${studentName},</h2>
        <p>Welcome to Cavite State University - Tanza Campus! We are glad to have you.</p>
        <p>You may now proceed to go to the school and register for your courses.</p>
        <p>Please note that you will need to provide your student account to access your courses.</p>
        <br>
        <p>Best Regards,</p>
        <p>Your Organization Team</p>
    `;
};

// Export the function
module.exports = {
    transporter,
    generateEmailTemplate
};
