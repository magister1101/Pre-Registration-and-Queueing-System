const jwt = require('jsonwebtoken');
const dotenv = require('dotenv').config();


module.exports = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        console.log("auth header:", authHeader);

        if (!authHeader) {
            return res.status(401).json({ message: 'Authorization header missing' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // console.log("auth header:", authHeader);


        req.userData = decoded;
        next();
    } catch (error) {
        console.error("JWT Error:", error);
        let message = 'Authentication failed';
        if (error.name === 'TokenExpiredError') {
            message = 'Token has expired';
        } else if (error.name === 'JsonWebTokenError') {

            message = 'Invalid token';

        }
        return res.status(401).json({ message });
    }
};