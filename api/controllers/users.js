const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { transporter, generateEmailTemplate, generateEmailTemplateInvalidCredentials } = require('../utils/email');

const User = require('../models/user');
const Course = require('../models/course');


exports.sendEmail = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid user ID format." });
        }

        // Use populate to get course details
        const user = await User.findById(id)
            .populate('courseToTake')  // Populate course details
            .exec();

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        const studentName = `${user.firstName} ${user.middleName ? user.middleName + " " : ""}${user.lastName}`;
        const recipientEmail = user.email;

        // Validate and map the courses
        const courseToTake = Array.isArray(user.courseToTake) ? user.courseToTake : [];
        console.log("Populated courseToTake:", JSON.stringify(courseToTake, null, 2));

        // Map courses with name and code
        const formattedCourses = courseToTake.length > 0
            ? courseToTake.map(course => ({
                courseName: course.name || "Unknown",
                courseCode: course.code || "-"
            }))
            : [{ courseName: "No courses found", courseCode: "-" }];

        // Email options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            replyTo: process.env.EMAIL_USER,
            to: recipientEmail,
            subject: "Cavite State University Pre-Registration",
            text: generateEmailTemplate(studentName, formattedCourses),
            html: generateEmailTemplate(studentName, formattedCourses)
        };

        // Update isEmailSent before sending the email
        await User.findByIdAndUpdate(id, { isEmailSent: true });

        // Send the email
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error("Email Error:", err);
                return res.status(500).json({ message: "Failed to send email." });
            }
            console.log("Email sent:", info.response);
            res.status(200).json({ message: "Email sent successfully!" });
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

        performUpdate(id, { isEmailSent: false }, res);

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
        const { isArchived, query, filter, emailed, role, program, year } = req.query;

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

        if (year) {
            const escapedFilter = escapeRegex(year);
            queryConditions.push({
                $or: [
                    { year: { $regex: escapedFilter, $options: 'i' } },
                ],
            });
        }

        if (program) {
            const escapedProgram = escapeRegex(program);
            queryConditions.push({
                $or: [
                    { course: { $regex: escapedProgram, $options: 'i' } },
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
            .populate('courses', 'name code')
            .sort({ createdAt: -1 });

        return res.status(200).json(users);

    } catch (error) {
        console.error('Error retrieving users:', error);
        return res.status(500).json({
            message: "Error in retrieving users",
            error: error.message || error,
        });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { query, role, program, year, emailed, isArchived } = req.query;

        const escapeRegex = (value) => {
            return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };

        let deleteCriteria = {};
        const queryConditions = [];

        if (role) {
            const escapedRole = escapeRegex(role);
            queryConditions.push({
                role: { $regex: escapedRole, $options: 'i' }
            });
        }

        if (program) {
            const escapedProgram = escapeRegex(program);
            queryConditions.push({
                course: { $regex: escapedProgram, $options: 'i' }
            });
        }

        if (year) {
            const escapedYear = escapeRegex(year);
            queryConditions.push({
                year: { $regex: escapedYear, $options: 'i' }
            });
        }

        if (emailed) {
            const escapedEmailed = escapeRegex(emailed);
            queryConditions.push({
                email: { $regex: escapedEmailed, $options: 'i' }
            });
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
                { username: { $regex: escapedQuery, $options: 'i' } }
            );

            queryConditions.push({ $or: orConditions });
        }

        if (isArchived) {
            const isArchivedBool = isArchived === 'true';
            queryConditions.push({ isArchived: isArchivedBool });
        }

        if (queryConditions.length > 0) {
            deleteCriteria = { $and: queryConditions };
        }

        const result = await User.deleteMany(deleteCriteria);

        return res.status(200).json({
            message: 'Users deleted successfully',
            deletedCount: result.deletedCount
        });

    } catch (error) {
        console.error('Error deleting users:', error);
        return res.status(500).json({
            message: 'Error in deleting users',
            error: error.message || error
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
            $or: [{ username: req.body.username }]
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
            isEmailSent: req.body.isEmailSent,
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
                if (user[0].isEmailSent && !user[0].isArchived) {
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
                } else {
                    return res.status(401).json({
                        message: 'Auth Failed'
                    });
                }
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

exports.enrollRegular = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        const semester = req.body.semester;

        if (!user) {
            console.log('User not found')
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.isRegular) {
            console.log('User is not marked as a regular student')
            return res.status(400).json({ message: 'User is not marked as a regular student' });
        }

        if (!user.course || !user.year || !semester) {
            console.log('Missing course, year, or semester information in user profile')
            return res.status(400).json({ message: 'Missing course, year, or semester information in user profile' });
        }

        // Find matching courses based on course, year, and semester
        const matchingCourses = await Course.find({
            course: user.course,
            year: user.year,
            semester: semester,
        });

        console.log(user.course, user.year, semester)
        console.log(matchingCourses)

        if (!matchingCourses.length) {
            console.log('No matching courses found')
            return res.status(404).json({ message: 'No matching courses found' });
        }

        // Assign courseToTake
        user.courseToTake = matchingCourses.map(course => course._id.toString());
        await user.save();

        res.status(200).json({
            message: 'Courses assigned successfully',
            courseToTake: user.courseToTake
        });

    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

