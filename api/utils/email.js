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
const generateEmailTemplate = (studentName, courseToTake) => {
    return `
        <h2>Dear ${studentName},</h2>

        <p>We are pleased to welcome you to <strong>Cavite State University - Tanza Campus</strong>. We are delighted to have you join our academic community.</p>

        <p>You may now proceed to the campus to finalize your registration. Kindly ensure that you bring the necessary documents and provide your student account credentials to access your courses.</p>

        <br>

        <p><strong>The following courses have been successfully enrolled for you:</strong></p>
        <ul>
            ${courseToTake.map((course) => `
                <li><strong>${course.courseName}</strong> (${course.courseCode})</li>
            `).join('')}
        </ul>

        <br>

        <p>Should you have any questions or require further assistance, please feel free to reach out to the registration office.</p>

        <br>

        <p>Best regards,</p>
        <p><strong>Office of the Registrar</strong></p>
        <p>Cavite State University - Tanza Campus</p>
    `;
};



const generateEmailTemplateInvalidCredentials = (studentName) => {
    return `
        <h2>Hello ${studentName},</h2>
        <p>We noticed that you attempted to register courses you have not taken.</p>
        <p>Please double-check the courses you have registered for and try to register again again.</p>
        <p>If you continue to misinput your courses, you will be unable to enroll in your courses.</p>
        <br>
        <p>Best Regards,</p>
        <p>Your Organization Team</p>
    `;
};

// Export Transporter & Template
module.exports = {
    transporter,
    generateEmailTemplate,
    generateEmailTemplateInvalidCredentials,
};
