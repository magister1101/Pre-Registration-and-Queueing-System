const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { transporter, generateEmailTemplate, generateEmailTemplateInvalidCredentials } = require('../utils/email');

const User = require('../models/user');


exports.sendEmail = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid user ID format." });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        const studentName = `${user.firstName} ${user.middleName ? user.middleName + " " : ""}${user.lastName}`;
        const recipientEmail = user.email;

        // Email options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            replyTo: process.env.EMAIL_USER,
            to: recipientEmail,
            subject: "Cavite State University Pre-Registration",
            text: generateEmailTemplate(studentName),
            html: generateEmailTemplate(studentName)
        };

        performUpdate(id, { isEmailSent: true }, res);

        await new Promise((resolve, reject) => {
            // send mail
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.error(err);
                    reject(err);
                    res.status(500).json({ message: "Email failed successfully!" });
                } else {
                    console.log(info);
                    resolve(info);
                    res.status(200).json({ message: "Email sent successfully!" });
                }
            });
        });




    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ error: "Failed to send email" });
    }
};

exports.sendEmailReject = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid user ID format." });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        const studentName = `${user.firstName} ${user.middleName ? user.middleName + " " : ""}${user.lastName}`;
        const recipientEmail = user.email;

        // Email options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            replyTo: process.env.EMAIL_USER,
            to: recipientEmail,
            subject: "Cavite State University Pre-Registration",
            text: generateEmailTemplateInvalidCredentials(studentName),
            html: generateEmailTemplateInvalidCredentials(studentName)
        };

        performUpdate(id, { isEmailSent: true }, res);

        await new Promise((resolve, reject) => {
            // send mail
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.error(err);
                    reject(err);
                    res.status(500).json({ message: "Email failed successfully!" });
                } else {
                    console.log(info);
                    resolve(info);
                    res.status(200).json({ message: "Email sent successfully!" });
                }
            });
        });




    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ error: "Failed to send email" });
    }
};

const performUpdate = (id, updateFields, res) => {
    User.findByIdAndUpdate(id, updateFields, { new: true })
        .then((updatedUser) => {
            if (!updatedUser) {
                return ({ message: "User not found" });
            }
            return updatedUser;

        })
        .catch((err) => {
            return ({
                message: "Error in updating user",
                error: err
            });
        })
};

exports.getUser = async (req, res) => {
    try {
        const { isArchived, query, filter, emailed, role } = req.query;

        const escapeRegex = (value) => {
            return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };

        let searchCriteria = {};
        const queryConditions = [];

        if (role) {
            const escapedQuery = escapeRegex(role);
            const orConditions = [];

            orConditions.push(
                { role: { $regex: escapedQuery, $options: 'i' } },
            );

            queryConditions.push({ $or: orConditions });
        }

        if (query) {
            const escapedQuery = escapeRegex(query);
            const orConditions = [];

            if (mongoose.Types.ObjectId.isValid(query)) {
                orConditions.push({ _id: query });
            }
            orConditions.push(
                { firstName: { $regex: escapedQuery, $options: 'i' } },
                { lastName: { $regex: escapedQuery, $options: 'i' } },
                { middleName: { $regex: escapedQuery, $options: 'i' } },
                { email: { $regex: escapedQuery, $options: 'i' } },
                { username: { $regex: escapedQuery, $options: 'i' } },
            );

            queryConditions.push({ $or: orConditions });
        }

        if (filter) {
            const escapedFilter = escapeRegex(filter);
            queryConditions.push({
                $or: [
                    { role: { $regex: escapedFilter, $options: 'i' } },
                ],
            });
        }

        if (emailed) {
            const escapedEmailed = escapeRegex(emailed);
            queryConditions.push({
                $or: [
                    { role: { $regex: escapedEmailed, $options: 'i' } },
                ],
            });
        }

        if (isArchived) {
            const isArchivedBool = isArchived === 'true'; // Convert to boolean
            queryConditions.push({ isArchived: isArchivedBool });
        }

        if (queryConditions.length > 0) {
            searchCriteria = { $and: queryConditions };
        }
        const users = await User.find(searchCriteria)
            .populate('courses', 'name');

        return res.status(200).json(users);

    } catch (error) {
        console.error('Error retrieving users:', error);
        return res.status(500).json({
            message: "Error in retrieving users",
            error: error.message || error,
        });
    }
};

exports.myProfile = async (req, res) => {
    try {
        User.findOne({ _id: req.userData.userId })
            .exec()
            .then(user => {
                return res.status(200).json(user);
            })
    }
    catch (error) {
        console.error('Error retrieving user:', error);
        return res.status(500).json({
            message: "Error in retrieving user",
            error: error.message || error,
        });
    }
};

exports.createUser = async (req, res, next) => {
    try {
        const existingUser = await User.find({
            $or: [{ username: req.body.username }, { email: req.body.email }]
        });

        if (existingUser.length > 0) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const userId = new mongoose.Types.ObjectId();
        const user = new User({
            _id: userId,
            username: req.body.username,
            password: hashedPassword,
            email: req.body.email,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            middleName: req.body.middleName,
            file: req.body.file,

            role: req.body.role,
            group: req.body.group,

            courses: req.body.courses,

            studentNumber: req.body.studentNumber,
            course: req.body.course,
            year: req.body.year,
            section: req.body.section,

            isRegular: req.body.isRegular,

            isArchived: req.body.isArchived,
        });

        const saveUser = await user.save();

        return res.status(201).json({
            saveUser
        });

    }
    catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({
            message: "Error in creating user",
            error: error.message || error,
        });
    }
};

exports.loginUser = async (req, res, next) => {
    try {
        User.find({ username: req.body.username })
            .exec()
            .then(user => {
                if (user.length < 1) {
                    return res.status(401).json({
                        message: 'Auth Failed (UserName Not found)'
                    });
                }
                bcrypt.compare(req.body.password, user[0].password, (err, result) => {
                    if (err) {
                        return res.status(401).json({
                            message: 'Auth Failed (incorrect Password)'
                        });
                    }
                    if (result) {
                        const token = jwt.sign({
                            userId: user[0]._id,
                            username: user[0].username,
                        },
                            process.env.JWT_SECRET, //private key
                            {
                                expiresIn: "8h" //key expires in # hour
                            }
                        )

                        return res.status(200).json({
                            message: 'Auth Successful',
                            token: token,
                        });
                    }
                    return res.status(401).json({
                        message: 'Auth Failed'
                    });
                })
            })
    }
    catch (error) {
        console.error('Error logging in user:', error);
        return res.status(500).json({
            message: "Error in logging in user",
            error: error.message || error,
        });
    }
};

exports.tokenValidation = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(200).json({ isValid: false });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return res.json({ isValid: true });
    } catch (error) {
        console.error('Error validating token:', error);
        return res.status(500).json({ isValid: false });
    }
};

exports.resetQueueCounter = async (req, res, next) => {
    try {
        const userId = req.userData.userId;
        const updateFields = {
            successfulQueue: 0,
            missedQueue: 0,
            transferredQueue: 0,
        }

        const updatedUser = performUpdate(userId, updateFields, res);
        return res.status(200).json(updatedUser)

    } catch (error) {
        console.error('Error resetting queue:', error);
    }
};

exports.updateUser = async (req, res, next) => {
    try {
        const userId = req.params.userId;
        const updateFields = req.body;
        console.log(updateFields);

        if (updateFields.password) {
            const bcrypt = require('bcrypt');
            const saltRounds = 10;

            const hashedPassword = await bcrypt.hash(updateFields.password, saltRounds);
            updateFields.password = hashedPassword;
        }
        const updatedUser = performUpdate(userId, updateFields, res);
        return res.status(200).json(updatedUser)


    }
    catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({
            message: "Error in updating user",
            error: error.message || error,
        });
    }
};