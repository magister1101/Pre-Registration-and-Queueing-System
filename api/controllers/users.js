const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const xlsx = require('xlsx');

const { transporter, customEmailtemplate, generateEmailTemplate, generateEmailTemplateInvalidCredentials } = require('../utils/email');

const User = require('../models/user');
const Course = require('../models/course');
const Program = require('../models/program');
const Semester = require('../models/semester');
const TransactionLog = require('../models/transactionLog');
const Schedule = require('../models/schedule')
const TestModel = require('../models/testModel');
const nodemailer = require("nodemailer");


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


exports.emailCourseStudents = async (req, res) => {
    try {
        const { courseId, subject, message, date } = req.body;

        if (!courseId || !subject || !message) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const program = await Program.findById(courseId);
        if (!program) {
            return res.status(404).json({ error: "Program not found" });
        }

        const students = await User.find({ course: program.name });
        if (!students || students.length === 0) {
            return res.status(404).json({ error: "No students found in this program" });
        }

        for (const student of students) {
            if (!student.email) continue;

            const mailOptions = {
                from: process.env.EMAIL_USER,
                replyTo: process.env.EMAIL_USER,
                to: student.email,
                subject,
                text: `Hello ${student.firstName || "Student"},\n\n${message}\n\nDate: ${date}`,
                html: `<p>Hello <b>${student.firstName || "Student"}</b>,</p>
                       <p>${message}</p>
                       <p><b>Date:</b> ${date}</p>`,
            };

            await transporter.sendMail(mailOptions);
        }

        res.status(200).json({
            message: `Emails sent to ${students.length} student(s) in program ${program.name}`,
        });

    } catch (err) {
        console.error("❌ Error sending course emails:", err);
        res.status(500).json({ error: "Failed to send course emails" });
    }
};


exports.emailStudent = async (req, res) => {
    try {

        const { id, date, subject, message } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid user ID format." });
        }
        const user = await User.findById(id).exec();

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
            subject: subject,
            text: customEmailtemplate(studentName, date, message),
            html: customEmailtemplate(studentName, date, message),
        };



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
        const { isArchived, isEnrolled, isApproved, query, filter, emailed, role, program, year } = req.query;

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

        if (isEnrolled) {
            const isEnrolledBool = isEnrolled === 'true'; // Convert to boolean
            queryConditions.push({ isEnrolled: isEnrolledBool });
        }
        if (isApproved) {
            const isApprovedBool = isApproved === 'true'; // Convert to boolean
            queryConditions.push({ isApproved: isApprovedBool });
        }

        if (isArchived) {
            const isArchivedBool = isArchived === 'true'; // Convert to boolean
            queryConditions.push({ isArchived: isArchivedBool });
        }

        if (queryConditions.length > 0) {
            searchCriteria = { $and: queryConditions };
        }
        const users = await User.find(searchCriteria)
            .populate('courses.courseId', 'name code')
            .populate({
                path: 'courseToTake',
                select: 'name code unit course semester description prerequisite',
                populate: {
                    path: 'prerequisite',
                    select: 'name code unit semester'
                }
            })
            .populate({
                path: 'courseToTakeRemoved',
                select: 'name code unit course semester description prerequisite',
                populate: {
                    path: 'prerequisite',
                    select: 'name code unit semester'
                }
            })
            .populate('schedule', 'code section course day schedule')
            .populate({
                path: 'schedule',
                select: 'code section course day schedule',
                populate: {
                    path: 'schedule',
                    select: 'code section course schedule'
                }
            })
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
        const user = await User.findOne({ _id: req.userData.userId })
            .populate('courseToTake', 'name code unit course description')
            .populate('courseToTakeRemoved', 'name code unit course description')
            .populate({
                path: 'schedule',
                populate: {
                    path: 'course', // get the course details inside the schedule
                }
            })

        return res.status(200).json(user);
    } catch (error) {
        console.error('Error retrieving user:', error);
        return res.status(500).json({
            message: "Error in retrieving user",
            error: error.message || error,
        });
    }
};

// exports.createUser = async (req, res, next) => {
//     try {
//         const existingUser = await User.find({
//             $or: [{ username: req.body.username }]
//         });

//         if (existingUser.length > 0) {
//             return res.status(400).json({ message: "User already exists" });
//         }

//         const hashedPassword = await bcrypt.hash(req.body.username, 10);

//         const userId = new mongoose.Types.ObjectId();
//         const user = new User({
//             _id: userId,
//             username: req.body.username,
//             password: hashedPassword,
//             email: req.body.email,
//             firstName: req.body.firstName,
//             lastName: req.body.lastName,
//             middleName: req.body.middleName,
//             file: req.body.file,

//             role: req.body.role,
//             group: req.body.group,

//             courses: req.body.courses,

//             studentNumber: req.body.studentNumber,
//             course: req.body.course,
//             year: req.body.year,
//             section: req.body.section,

//             isRegular: req.body.isRegular,
//             isEmailSent: req.body.isEmailSent,
//             isArchived: req.body.isArchived,
//         });

//         const saveUser = await user.save();

//         return res.status(201).json({
//             saveUser
//         });

//     }
//     catch (error) {
//         console.error('Error creating user:', error);
//         return res.status(500).json({
//             message: "Error in creating user",
//             error: error.message || error,
//         });
//     }
// };

exports.createUser = async (req, res, next) => {
    try {
        // Build query conditions, only check studentNumber if provided and not empty
        const queryConditions = [
            { username: req.body.username },
            { email: req.body.email }
        ];
        
        // Only check studentNumber if it's provided and not a placeholder
        if (req.body.studentNumber && 
            req.body.studentNumber.trim() !== '' && 
            !req.body.studentNumber.startsWith('NON-STUDENT-')) {
            queryConditions.push({ studentNumber: req.body.studentNumber });
        }

        const existingUser = await User.find({
            $or: queryConditions
        });

        if (existingUser.length > 0) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const userId = new mongoose.Types.ObjectId();
        const userData = {
            _id: userId,
            username: req.body.username,
            password: hashedPassword,
            email: req.body.email,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            role: req.body.role,
        };

        // Only add optional fields if they are provided and not empty
        if (req.body.middleName) userData.middleName = req.body.middleName;
        if (req.body.file) userData.file = req.body.file;
        if (req.body.group) userData.group = req.body.group;
        if (req.body.courses) userData.courses = req.body.courses;
        
        // Handle studentNumber: if provided, use it; otherwise generate unique placeholder for non-student accounts
        if (req.body.studentNumber && req.body.studentNumber.trim() !== '') {
            userData.studentNumber = req.body.studentNumber;
        } else {
            // Generate unique placeholder for admin/cashier accounts to avoid null duplicate key error
            // Format: NON-STUDENT-{userId} to ensure uniqueness
            userData.studentNumber = `NON-STUDENT-${userId.toString()}`;
        }
        if (req.body.course) userData.course = req.body.course;
        if (req.body.year) userData.year = req.body.year;
        if (req.body.section) userData.section = req.body.section;
        
        // Address fields
        if (req.body.houseNumber) userData.houseNumber = req.body.houseNumber;
        if (req.body.street) userData.street = req.body.street;
        if (req.body.barangay) userData.barangay = req.body.barangay;
        if (req.body.city) userData.city = req.body.city;
        if (req.body.province) userData.province = req.body.province;
        
        // Personal information
        if (req.body.sex) userData.sex = req.body.sex;
        if (req.body.birthDate) userData.birthDate = req.body.birthDate;
        
        // Educational background
        if (req.body.elementarySchool) userData.elementarySchool = req.body.elementarySchool;
        if (req.body.highSchool) userData.highSchool = req.body.highSchool;
        if (req.body.seniorHighSchool) userData.seniorHighSchool = req.body.seniorHighSchool;
        if (req.body.schoolAddress) userData.schoolAddress = req.body.schoolAddress;
        
        // Boolean flags
        if (req.body.isYouIndigenous !== undefined) userData.isYouIndigenous = req.body.isYouIndigenous;
        if (req.body.isDisabled !== undefined) userData.isDisabled = req.body.isDisabled;
        if (req.body.isFirstCollegeGraduate !== undefined) userData.isFirstCollegeGraduate = req.body.isFirstCollegeGraduate;
        
        // Status flags
        if (req.body.isRegular !== undefined) userData.isRegular = req.body.isRegular;
        if (req.body.isEmailSent !== undefined) userData.isEmailSent = req.body.isEmailSent;
        if (req.body.isArchived !== undefined) userData.isArchived = req.body.isArchived;

        const user = new User(userData);
        const saveUser = await user.save();

        console.log(saveUser);
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
        console.log(req.body)
        User.find({ username: req.body.username })
            .exec()
            .then(user => {
                if (user.length < 1) {
                    return res.status(401).json({
                        message: 'Auth Failed (UserName Not found)'
                    });
                }
                if (!user[0].isArchived) {
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

exports.removeCourseToTake = async (req, res, next) => {
    try {
        const { userId, courseId } = req.body;

        if (!userId || !courseId) {
            return res.status(400).json({ message: "userId and courseId are required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if course exists in courseToTake
        const courseIndex = user.courseToTake.indexOf(courseId);
        if (courseIndex === -1) {
            return res.status(400).json({ message: "Course not found in courseToTake" });
        }

        // Remove from courseToTake
        user.courseToTake.splice(courseIndex, 1);

        // Push to courseToTakeRemoved (if not already there)
        if (!user.courseToTakeRemoved.includes(courseId)) {
            user.courseToTakeRemoved.push(courseId);
        }

        await user.save();

        return res.status(200).json({ message: "Course removed successfully", user });
    } catch (err) {
        console.error("Error removing courseToTake:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

exports.addCourseToTake = async (req, res, next) => {
    try {
        const { userId, courseId } = req.body;

        if (!userId || !courseId) {
            return res.status(400).json({ message: "userId and courseId are required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.courseToTake.includes(courseId)) {
            return res.status(400).json({ message: "Course already exists in courseToTake" });
        }

        user.courseToTake.push(courseId);

        // If the course was previously removed, take it out from courseToTakeRemoved
        user.courseToTakeRemoved = user.courseToTakeRemoved.filter(c => c.toString() !== courseId);

        await user.save();

        return res.status(200).json({ message: "Course added successfully", user });
    } catch (err) {
        console.error("Error adding courseToTake:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

exports.addSchedule = async (req, res, next) => {
    try {
        const { userId, scheduleId } = req.body;
        console.log(req.body)

        if (!userId || !scheduleId) {
            return res.status(400).json({ message: 'userId and scheduleId are required' });
        }

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(scheduleId)) {
            return res.status(400).json({ message: 'Invalid userId or scheduleId' });
        }

        // Push schedule ID if not already added
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { schedule: scheduleId } }, // $addToSet prevents duplicates
            { new: true }
        ).populate('schedule'); // optional: to return populated schedules

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Schedule added successfully', user: updatedUser });
    } catch (err) {
        console.error('Error adding schedule:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
}

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
};

exports.insertStudent_W = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        const workbook = xlsx.read(req.file.buffer);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet);

        const currentSemester = await Semester.findOne();
        if (!currentSemester) {
            return res.status(400).json({ error: 'No active semester found.' });
        }

        for (const row of rows) {
            const {
                studentNumber,
                email,
                firstName,
                lastName,
                middleName,
                program,
                year,
                section,
                isRegular,
                isArchived = 'false',
                role = 'student'
            } = row;

            if (!studentNumber || !email || !firstName || !lastName) continue;

            const courses = [];
            let hasInvalidGrade = false;

            for (const key of Object.keys(row)) {
                if (![
                    'studentNumber', 'email', 'firstName', 'lastName',
                    'middleName', 'program', 'year', 'section',
                    'isRegular', 'isArchived', 'role'
                ].includes(key)) {
                    const grade = parseFloat(row[key]);

                    if (isNaN(grade)) continue;
                    if (grade === 0 || grade > 3) {
                        hasInvalidGrade = true;
                    }

                    const courseData = await Course.findOne({ code: key, isArchived: false });
                    if (courseData) {
                        courses.push({
                            courseId: courseData._id,
                            grade
                        });
                    }
                }
            }

            const studentName = `${firstName} ${middleName ? middleName + " " : ""}${lastName}`;

            // If grade is 0 or > 3, send notice email and save courses with grades
            if (hasInvalidGrade) {
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    replyTo: process.env.EMAIL_USER,
                    to: email,
                    subject: "Grade Concern - Cavite State University",
                    text: `Hi ${studentName},\n\nOne or more of your grades are either failing (above 3.0) or invalid (0). Please visit the university registrar to resolve this issue before enrollment.`,
                    html: `<p>Hi <strong>${studentName}</strong>,</p><p>One or more of your grades are either <strong>failing (above 3.0)</strong> or <strong>invalid (0)</strong>. Please visit the university registrar to resolve this issue before enrollment.</p>`
                };

                await transporter.sendMail(mailOptions);
                console.log(`Grade issue email sent to ${studentNumber}`);

                const hashedPassword = await bcrypt.hash(String(studentNumber), 10);

                const update = {
                    username: studentNumber,
                    password: hashedPassword,
                    email,
                    firstName,
                    lastName,
                    middleName,
                    role,
                    studentNumber,
                    course: program,
                    year,
                    section,
                    isRegular: isRegular === true || isRegular === 'true',
                    isArchived: isArchived === true || isArchived === 'true',
                    courses,  // Save courses and grades
                    isEmailSent: true,
                    courseToTake: []  // Don't assign courses to courseToTake
                };

                await User.findOneAndUpdate(
                    { studentNumber },
                    { $set: update },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                continue;
            }

            //if grade is valid then proceed with regular enrollment 
            const hashedPassword = await bcrypt.hash(String(studentNumber), 10);

            const update = {
                username: studentNumber,
                password: hashedPassword,
                email,
                firstName,
                lastName,
                middleName,
                role,
                studentNumber,
                course: program,
                year,
                section,
                isRegular: isRegular === true || isRegular === 'true',
                isArchived: isArchived === true || isArchived === 'true',
                courses
            };

            const user = await User.findOneAndUpdate(
                { studentNumber },
                { $set: update },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            if (user.isRegular) {
                const matchingCourses = await Course.find({
                    course: user.course,
                    year: user.year,
                    semester: currentSemester.semester
                });

                if (matchingCourses.length) {
                    user.courseToTake = matchingCourses.map(course => course._id.toString());
                    await user.save();

                    const formattedCourses = matchingCourses.map(course => ({
                        courseName: course.name || "Unknown",
                        courseCode: course.code || "-"
                    }));

                    const mailOptions = {
                        from: process.env.EMAIL_USER,
                        replyTo: process.env.EMAIL_USER,
                        to: email,
                        subject: "Your Enrollment - Cavite State University",
                        text: generateEmailTemplate(studentName, formattedCourses),
                        html: generateEmailTemplate(studentName, formattedCourses)
                    };

                    await User.findByIdAndUpdate(user._id, { isEmailSent: true });

                    transporter.sendMail(mailOptions, (err, info) => {
                        if (err) {
                            console.error(`Email Error (Regular): ${studentNumber}`, err);
                        } else {
                            console.log(`Enrollment email sent to ${studentNumber}:`, info.response);
                        }
                    });
                } else {
                    console.log(`No matching courses found for ${studentNumber}`);
                }
            } else {
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    replyTo: process.env.EMAIL_USER,
                    to: email,
                    subject: "Enrollment Notice - Cavite State University",
                    text: `Hi ${studentName},\n\nYou are currently marked as an irregular student. Please visit the university to discuss your enrollment for this semester.`,
                    html: `<p>Hi <strong>${studentName}</strong>,</p><p>You are currently marked as an <strong>irregular student</strong>. Please visit the university to discuss your enrollment for this semester.</p>`
                };

                await User.findByIdAndUpdate(user._id, { isEmailSent: true });

                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                        console.error(`Email Error (Irregular): ${studentNumber}`, err);
                    } else {
                        console.log(`Irregular notice email sent to ${studentNumber}:`, info.response);
                    }
                });
            }
        }

        res.json({ message: 'Students processed successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// exports.insertStudents = async (req, res) => {
//     try {
//         if (!req.file) {
//             return res.status(400).json({ error: 'No file uploaded.' });
//         }

//         const workbook = xlsx.read(req.file.buffer);
//         const sheet = workbook.Sheets[workbook.SheetNames[0]];
//         const rows = xlsx.utils.sheet_to_json(sheet);

//         const currentSemester = await Semester.findOne();
//         if (!currentSemester) {
//             return res.status(400).json({ error: 'No active semester found.' });
//         }

//         for (const row of rows) {
//             const {
//                 studentNumber,
//                 email,
//                 firstName,
//                 lastName,
//                 middleName,
//                 program,
//                 year,
//                 section,
//                 isArchived = 'false',
//                 role = 'student'
//             } = row;

//             if (!studentNumber || !email || !firstName || !lastName) {
//                 continue; // Skip incomplete rows
//             }

//             let hasInvalidGrade = false;
//             const courses = [];

//             for (const key of Object.keys(row)) {
//                 if (![
//                     'studentNumber', 'email', 'firstName', 'lastName',
//                     'middleName', 'program', 'year', 'section',
//                     'isRegular', 'isArchived', 'role'
//                 ].includes(key)) {
//                     const grade = parseFloat(row[key]);
//                     if (isNaN(grade)) continue;

//                     if (grade === 0 || grade > 3) hasInvalidGrade = true;

//                     const courseData = await Course.findOne({ code: key, isArchived: false });
//                     if (courseData) {
//                         courses.push({
//                             courseId: courseData._id,
//                             grade
//                         });
//                     }
//                 }
//             }

//             const hashedPassword = await bcrypt.hash(String(studentNumber), 10);
//             const studentName = `${firstName} ${middleName ? middleName + " " : ""}${lastName}`;

//             const update = {
//                 username: studentNumber,
//                 password: hashedPassword,
//                 email,
//                 firstName,
//                 lastName,
//                 middleName,
//                 role,
//                 studentNumber,
//                 course: program,
//                 year,
//                 section,
//                 isRegular: !hasInvalidGrade,
//                 isArchived: isArchived === true || isArchived === 'true',
//                 courses,
//                 courseToTake: [],
//                 isEmailSent: true
//             };

//             const user = await User.findOneAndUpdate(
//                 { studentNumber },
//                 { $set: update },
//                 { upsert: true, new: true, setDefaultsOnInsert: true }
//             );

//             if (hasInvalidGrade) {
//                 const mailOptions = {
//                     from: process.env.EMAIL_USER,
//                     replyTo: process.env.EMAIL_USER,
//                     to: email,
//                     subject: "Grade Concern - Cavite State University",
//                     text: `Hi ${studentName},\n\nYou have a failing (above 3.0) or invalid (0) grade. Please visit the registrar to discuss your enrollment.`,
//                     html: `<p>Hi <strong>${studentName}</strong>,</p><p>You have a <strong>failing (above 3.0)</strong> or <strong>invalid (0)</strong> grade. Please visit the university registrar to discuss your enrollment.</p>`
//                 };

//                 transporter.sendMail(mailOptions, (err, info) => {
//                     if (err) {
//                         console.error(`Email Error (Invalid Grade): ${studentNumber}`, err);
//                     } else {
//                         console.log(`Grade issue email sent to ${studentNumber}:`, info.response);
//                     }
//                 });

//                 continue; // Skip courseToTake/enrollment
//             }

//             // If regular, proceed to enroll courses
//             const matchingCourses = await Course.find({
//                 course: user.course,
//                 year: user.year,
//                 semester: currentSemester.semester
//             });

//             if (matchingCourses.length) {
//                 user.courseToTake = matchingCourses.map(course => course._id.toString());
//                 await user.save();

//                 const formattedCourses = matchingCourses.map(course => ({
//                     courseName: course.name || "Unknown",
//                     courseCode: course.code || "-"
//                 }));

//                 const mailOptions = {
//                     from: process.env.EMAIL_USER,
//                     replyTo: process.env.EMAIL_USER,
//                     to: email,
//                     subject: "Your Enrollment - Cavite State University",
//                     text: generateEmailTemplate(studentName, formattedCourses),
//                     html: generateEmailTemplate(studentName, formattedCourses)
//                 };

//                 transporter.sendMail(mailOptions, (err, info) => {
//                     if (err) {
//                         console.error(`Email Error (Regular): ${studentNumber}`, err);
//                     } else {
//                         console.log(`Enrollment email sent to ${studentNumber}:`, info.response);
//                     }
//                 });
//             } else {
//                 console.log(`No matching courses found for ${studentNumber}`);
//             }
//         }

//         res.json({ message: 'Students imported and processed successfully.' });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// };

//insert version 1.0


// exports.insertStudents = async (req, res) => {
//     try {
//         if (!req.file) {
//             return res.status(400).json({ error: 'No file uploaded.' });
//         }

//         const workbook = xlsx.read(req.file.buffer);
//         const sheet = workbook.Sheets[workbook.SheetNames[0]];
//         const rows = xlsx.utils.sheet_to_json(sheet);

//         const currentSemester = await Semester.findOne();
//         if (!currentSemester) {
//             return res.status(400).json({ error: 'No active semester found.' });
//         }

//         for (const row of rows) {
//             const {
//                 studentNumber,
//                 email,
//                 firstName,
//                 lastName,
//                 middleName,
//                 program,
//                 year,
//                 section,
//                 isArchived = 'false',
//                 role = 'student'
//             } = row;

//             if (!studentNumber || !email || !firstName || !lastName) {
//                 continue; // Skip incomplete rows
//             }

//             let hasInvalidGrade = false;
//             const newCourses = [];

//             for (const key of Object.keys(row)) {
//                 if (![
//                     'studentNumber', 'email', 'firstName', 'lastName',
//                     'middleName', 'program', 'year', 'section',
//                     'isRegular', 'isArchived', 'role'
//                 ].includes(key)) {
//                     const grade = parseFloat(row[key]);
//                     if (isNaN(grade)) continue;

//                     if (grade === 0 || grade > 3) hasInvalidGrade = true;

//                     const courseData = await Course.findOne({ code: key, isArchived: false });
//                     if (courseData) {
//                         newCourses.push({
//                             courseId: courseData._id,
//                             grade
//                         });
//                     }
//                 }
//             }

//             const hashedPassword = await bcrypt.hash(String(studentNumber), 10);
//             const studentName = `${firstName} ${middleName ? middleName + " " : ""}${lastName}`;

//             const existingUser = await User.findOne({ studentNumber });

//             let mergedCourses = newCourses;

//             if (existingUser && Array.isArray(existingUser.courses)) {
//                 const courseMap = new Map();

//                 // Add existing courses first
//                 for (const existing of existingUser.courses) {
//                     courseMap.set(String(existing.courseId), {
//                         courseId: existing.courseId,
//                         grade: existing.grade
//                     });
//                 }

//                 // Override or add new grades from the uploaded file
//                 for (const incoming of newCourses) {
//                     courseMap.set(String(incoming.courseId), {
//                         courseId: incoming.courseId,
//                         grade: incoming.grade
//                     });
//                 }

//                 mergedCourses = Array.from(courseMap.values());
//             }

//             const update = {
//                 username: studentNumber,
//                 password: hashedPassword,
//                 email,
//                 firstName,
//                 lastName,
//                 middleName,
//                 role,
//                 studentNumber,
//                 course: program,
//                 year,
//                 section,
//                 isRegular: !hasInvalidGrade,
//                 isArchived: isArchived === true || isArchived === 'true',
//                 courses: mergedCourses,
//                 courseToTake: [],
//                 isEmailSent: true
//             };

//             const user = await User.findOneAndUpdate(
//                 { studentNumber },
//                 { $set: update },
//                 { upsert: true, new: true, setDefaultsOnInsert: true }
//             );

//             if (hasInvalidGrade) {
//                 const mailOptions = {
//                     from: process.env.EMAIL_USER,
//                     replyTo: process.env.EMAIL_USER,
//                     to: email,
//                     subject: "Grade Concern - Cavite State University",
//                     text: `Hi ${studentName},\n\nYou have a failing (above 3.0) or invalid (0) grade. Please visit the registrar to discuss your enrollment.`,
//                     html: `<p>Hi <strong>${studentName}</strong>,</p><p>You have a <strong>failing (above 3.0)</strong> or <strong>invalid (0)</strong> grade. Please visit the university registrar to discuss your enrollment.</p>`
//                 };

//                 transporter.sendMail(mailOptions, (err, info) => {
//                     if (err) {
//                         console.error(`Email Error (Invalid Grade): ${studentNumber}`, err);
//                     } else {
//                         console.log(`Grade issue email sent to ${studentNumber}:`, info.response);
//                     }
//                 });

//                 continue; // Skip courseToTake/enrollment
//             }

//             // If regular, proceed to enroll courses
//             const matchingCourses = await Course.find({
//                 course: user.course,
//                 year: user.year,
//                 semester: currentSemester.semester
//             });

//             if (matchingCourses.length) {
//                 user.courseToTake = matchingCourses.map(course => course._id.toString());
//                 await user.save();

//                 const formattedCourses = matchingCourses.map(course => ({
//                     courseName: course.name || "Unknown",
//                     courseCode: course.code || "-"
//                 }));

//                 const mailOptions = {
//                     from: process.env.EMAIL_USER,
//                     replyTo: process.env.EMAIL_USER,
//                     to: email,
//                     subject: "Your Enrollment - Cavite State University",
//                     text: generateEmailTemplate(studentName, formattedCourses),
//                     html: generateEmailTemplate(studentName, formattedCourses)
//                 };

//                 transporter.sendMail(mailOptions, (err, info) => {
//                     if (err) {
//                         console.error(`Email Error (Regular): ${studentNumber}`, err);
//                     } else {
//                         console.log(`Enrollment email sent to ${studentNumber}:`, info.response);
//                     }
//                 });
//             } else {
//                 console.log(`No matching courses found for ${studentNumber}`);
//             }
//         }

//         res.json({ message: 'Students imported and processed successfully.' });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// };

exports.insertStudents = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded." });
        }

        const workbook = xlsx.read(req.file.buffer);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const rows = xlsx.utils.sheet_to_json(sheet, {
            header: [
                "studentNumber",
                "email",
                "firstName",
                "lastName",
                "middleName",
                "program",
                "year",
                "section",
                "houseNumber",
                "street",
                "barangay",
                "city",
                "province",
                "sex",
                "birthDate",
                "elemenarySchool",
                "highSchool",
                "seniorHighSchool",
                "schoolAddress",
                "isYouIndigenous",
                "isDisabled",
                "isFirstCollegeGraduate",
                "isArchived",
                "role"
            ],
            range: 1,
        });

        const updatedUsers = [];

        // Helper function to parse date strings
        const parseDateString = (dateStr) => {
            if (!dateStr) return null;
            
            // Remove any extra spaces
            dateStr = String(dateStr).trim();
            
            // Try ISO format first (YYYY-MM-DD)
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) return date;
            }
            
            // Try US format (MM/DD/YYYY)
            if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                const parts = dateStr.split('/');
                const date = new Date(parts[2], parts[0] - 1, parts[1]);
                if (!isNaN(date.getTime())) return date;
            }
            
            // Try International format (DD/MM/YYYY)
            if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                const parts = dateStr.split('/');
                const date = new Date(parts[2], parts[1] - 1, parts[0]);
                if (!isNaN(date.getTime())) return date;
            }
            
            // Try Excel serial number (if it's a number)
            const num = Number(dateStr);
            if (!isNaN(num) && num > 0) {
                // Excel serial to JS date (Excel epoch is 1899-12-30)
                const excelEpoch = new Date(1899, 11, 30);
                const date = new Date(excelEpoch.getTime() + num * 24 * 60 * 60 * 1000);
                if (!isNaN(date.getTime())) return date;
            }
            
            return null;
        };

        // Helper function to convert to boolean
        const toBoolean = (value) => {
            if (value === undefined || value === null) return false;
            if (typeof value === 'boolean') return value;
            if (typeof value === 'string') {
                const trimmed = value.trim().toLowerCase();
                return trimmed === 'true' || trimmed === 'yes' || trimmed === '1';
            }
            if (typeof value === 'number') return value === 1;
            return false;
        };

        for (const row of rows) {
            const {
                studentNumber,
                email,
                firstName,
                lastName,
                middleName,
                program,
                year,
                section,
                houseNumber,
                street,
                barangay,
                city,
                province,
                sex,
                birthDate,
                elemenarySchool,
                highSchool,
                seniorHighSchool,
                schoolAddress,
                isYouIndigenous,
                isDisabled,
                isFirstCollegeGraduate,
                isArchived,
                role = "student"
            } = row;

            if (!studentNumber || !firstName || !lastName) {
                console.log("Invalid row (skipped):", row);
                continue;
            }

            // FIND EXISTING USER
            let user = await User.findOne({ studentNumber });

            // CREATE NEW USER + _id
            if (!user) {
                console.log(`User not found, creating new: ${studentNumber}`);

                const userId = new mongoose.Types.ObjectId();

                user = new User({
                    _id: userId,
                    studentNumber,
                    username: studentNumber,
                    password: await bcrypt.hash(String(studentNumber), 10),
                });
            }

            // UPDATE FIELDS
            user.email = email;
            user.firstName = firstName;
            user.lastName = lastName;
            user.middleName = middleName;
            user.course = program;
            user.year = year;
            user.section = section;
            user.role = role;

            user.houseNumber = houseNumber;
            user.street = street;
            user.barangay = barangay;
            user.city = city;
            user.province = province;

            user.sex = sex;
            // Use the date parser instead of direct Date constructor
            user.birthDate = parseDateString(birthDate);

            user.elemenarySchool = elemenarySchool;
            user.highSchool = highSchool;
            user.seniorHighSchool = seniorHighSchool;
            user.schoolAddress = schoolAddress;

            // Use boolean converter for all boolean fields
            user.isYouIndigenous = toBoolean(isYouIndigenous);
            user.isDisabled = toBoolean(isDisabled);
            user.isFirstCollegeGraduate = toBoolean(isFirstCollegeGraduate);
            user.isArchived = toBoolean(isArchived);

            try {
                const savedUser = await user.save();
                updatedUsers.push(savedUser);
                console.log(`Successfully processed: ${studentNumber} - ${firstName} ${lastName}`);
            } catch (saveError) {
                console.error(`Error saving user ${studentNumber}:`, saveError.message);
                // Continue with next user instead of stopping entire process
                continue;
            }
        }

        res.status(200).json({
            message: "Student information saved successfully.",
            updatedCount: updatedUsers.length,
            data: updatedUsers
        });

    } catch (error) {
        console.error("Insert Student Info Error:", error);
        res.status(500).json({ 
            error: "Internal Server Error",
            details: error.message 
        });
    }
};

// exports.insertTest = async (req, res) => {
//     try {
//         if (!req.file) {
//             return res.status(400).json({ error: "No file uploaded." });
//         }

//         const workbook = xlsx.read(req.file.buffer);
//         const sheet = workbook.Sheets[workbook.SheetNames[0]];

//         const rows = xlsx.utils.sheet_to_json(sheet, {
//             header: [
//                 "studentNumber",
//                 "email",
//                 "firstName",
//                 "lastName",
//                 "middleName",
//                 "program",
//                 "year",
//                 "section",
//                 "houseNumber",
//                 "street",
//                 "barangay",
//                 "city",
//                 "province",
//                 "sex",
//                 "birthDate",
//                 "elemenarySchool",
//                 "highSchool",
//                 "seniorHighSchool",
//                 "schoolAddress",
//                 "isYouIndigenous",
//                 "isDisabled",
//                 "isFirstCollegeGraduate",
//                 "isArchived",
//                 "role"
//             ],
//             range: 1,
//         });

//         const updatedUsers = [];

//         for (const row of rows) {
//             const {
//                 studentNumber,
//                 email,
//                 firstName,
//                 lastName,
//                 middleName,
//                 program,
//                 year,
//                 section,
//                 houseNumber,
//                 street,
//                 barangay,
//                 city,
//                 province,
//                 sex,
//                 birthDate,
//                 elemenarySchool,
//                 highSchool,
//                 seniorHighSchool,
//                 schoolAddress,
//                 isYouIndigenous = "false",
//                 isDisabled = "false",
//                 isFirstCollegeGraduate = "false",
//                 isArchived = "false",
//                 role = "student"
//             } = row;

//             if (!studentNumber || !firstName || !lastName) {
//                 console.log("Invalid row (skipped):", row);
//                 continue;
//             }

//             // FIND EXISTING USER
//             let user = await User.findOne({ studentNumber });

//             // CREATE NEW USER + _id
//             if (!user) {
//                 console.log(`User not found, creating new: ${studentNumber}`);

//                 const userId = new mongoose.Types.ObjectId(); // <-- UNIQUE _id HERE

//                 user = new User({
//                     _id: userId,                 // <-- SET NEW ID
//                     studentNumber,
//                     username: studentNumber,
//                     password: await bcrypt.hash(String(studentNumber), 10),
//                 });
//             }

//             // UPDATE FIELDS
//             user.email = email;
//             user.firstName = firstName;
//             user.lastName = lastName;
//             user.middleName = middleName;
//             user.course = program;
//             user.year = year;
//             user.section = section;
//             user.role = role;

//             user.houseNumber = houseNumber;
//             user.street = street;
//             user.barangay = barangay;
//             user.city = city;
//             user.province = province;

//             user.sex = sex;
//             user.birthDate = birthDate ? new Date(birthDate) : null;

//             user.elemenarySchool = elemenarySchool;
//             user.highSchool = highSchool;
//             user.seniorHighSchool = seniorHighSchool;
//             user.schoolAddress = schoolAddress;

//             user.isYouIndigenous = isYouIndigenous === "true" || isYouIndigenous === true;
//             user.isDisabled = isDisabled === "true" || isDisabled === true;
//             user.isFirstCollegeGraduate =
//                 isFirstCollegeGraduate === "true" || isFirstCollegeGraduate === true;

//             user.isArchived = isArchived === "true" || isArchived === true;

//             const savedUser = await user.save();
//             updatedUsers.push(savedUser);
//         }

//         res.status(200).json({
//             message: "Student information saved successfully.",
//             updatedCount: updatedUsers.length,
//             data: updatedUsers
//         });

//     } catch (error) {
//         console.error("Insert Student Info Error:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// };


exports.insertGradesByRow = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded." });
        }

        const workbook = xlsx.read(req.file.buffer);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet, {
            header: ["studentNumber", "email", "firstName", "lastName", "middleName", "program", "year", "section",],
            range: 1,
        });

        const updatedUsers = [];

        for (const row of rows) {
            const {
                studentNumber,
                email,
                firstName,
                lastName,
                middleName,
                program,
                year,
                section,
                isArchived = 'false',
                role = 'student'
            } = row;

            if (!studentNumber || !courseCode) {
                console.log("Invalid row (skipped):", row);
                continue;
            }

            const grade = parseFloat(rawGrade);

            // Check if courseCode exists
            const course = await Course.findOne({ code: courseCode });
            if (!course) {
                console.log(`CourseCode NOT found in database: ${courseCode}`);
                continue;
            }

            const courseId = course._id.toString();

            // Find student
            const user = await User.findOne({ studentNumber });
            if (!user) {
                console.log(`User not found: ${studentNumber}`);
                continue;
            }

            // Check if course already exists in user's courses
            const existingCourse = user.courses.find(
                (c) => c.courseId === courseId
            );

            if (existingCourse) {
                // Update grade + sem + year
                existingCourse.grade = grade;
                existingCourse.sem = sem;
                existingCourse.year = year;
            } else {
                // Add new course entry with sem/year
                user.courses.push({
                    courseId: courseId,
                    grade,
                    sem,
                    year
                });
            }

            const savedUser = await user.save();
            updatedUsers.push(savedUser);
        }

        console.log("UPDATED USERS:", updatedUsers);

        res.status(200).json({
            message: "Grades + sem/year saved successfully.",
            updatedCount: updatedUsers.length,
            data: updatedUsers
        });

    } catch (error) {
        console.error("Insert Grade Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.insertTest = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded." });
        }

        const workbook = xlsx.read(req.file.buffer);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet, {
            header: ["studentNumber", "courseCode", "grade", "sem", "year"],
            range: 1,
        });

        const updatedUsers = [];

        for (const row of rows) {
            const {
                studentNumber,
                courseCode,
                grade: rawGrade,
                sem,
                year
            } = row;

            if (!studentNumber || !courseCode) {
                console.log("Invalid row (skipped):", row);
                continue;
            }

            const grade = parseFloat(rawGrade);

            // Check if courseCode exists
            const course = await Course.findOne({ code: courseCode });
            if (!course) {
                console.log(`CourseCode NOT found in database: ${courseCode}`);
                continue;
            }

            const courseId = course._id.toString();

            // Find student
            const user = await User.findOne({ studentNumber });
            if (!user) {
                console.log(`User not found: ${studentNumber}`);
                continue;
            }

            // Check if course already exists in user's courses
            const existingCourse = user.courses.find(
                (c) => c.courseId === courseId
            );

            if (existingCourse) {
                // Update grade + sem + year
                existingCourse.grade = grade;
                existingCourse.sem = sem;
                existingCourse.year = year;
            } else {
                // Add new course entry with sem/year
                user.courses.push({
                    courseId: courseId,
                    grade,
                    sem,
                    year
                });
            }

            const savedUser = await user.save();
            updatedUsers.push(savedUser);
        }

        console.log("UPDATED USERS:", updatedUsers);

        res.status(200).json({
            message: "Grades + sem/year saved successfully.",
            updatedCount: updatedUsers.length,
            data: updatedUsers
        });

    } catch (error) {
        console.error("Insert Grade Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


exports.clockIn = async (req, res) => {
    const { userId } = req.body;

    try {
        const openSession = await TransactionLog.findOne({ userId, clockOut: null });
        if (openSession) {
            return res.status(400).json({ message: 'You must clock out first.' });
        }

        const newRecord = new TransactionLog({
            userId,
            clockIn: new Date()
        });

        await newRecord.save();
        res.json({ message: 'Clocked in.', record: newRecord });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.clockOut = async (req, res) => {
    const { userId } = req.body;

    try {
        const lastRecord = await TransactionLog.findOne({ userId, clockOut: null }).sort({ clockIn: -1 });

        if (!lastRecord) {
            return res.status(400).json({ message: 'No open clock-in found.' });
        }

        lastRecord.clockOut = new Date(); // Fixed: matches schema field
        await lastRecord.save();

        res.json({ message: 'Clocked out.', record: lastRecord });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getTransactionLogs = async (req, res) => {
    try {
        const { query, filter, userId } = req.query;

        const escapeRegex = (value) => {
            return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };

        let searchCriteria = {};
        const queryConditions = [];

        if (query) {
            const escapedQuery = escapeRegex(query);
            const orConditions = [];

            if (mongoose.Types.ObjectId.isValid(query)) {
                orConditions.push({ _id: query });
            }

            orConditions.push(
                { 'userId.firstName': { $regex: escapedQuery, $options: 'i' } },
                { 'userId.lastName': { $regex: escapedQuery, $options: 'i' } },
                { 'userId.middleName': { $regex: escapedQuery, $options: 'i' } },
                { 'userId.email': { $regex: escapedQuery, $options: 'i' } },
                { 'userId.username': { $regex: escapedQuery, $options: 'i' } },
                { 'userId.role': { $regex: escapedQuery, $options: 'i' } }
            );

            queryConditions.push({ $or: orConditions });
        }

        if (filter) {
            const escapedFilter = escapeRegex(filter);
            queryConditions.push({
                $or: [
                    { userId: { $regex: escapedFilter, $options: 'i' } },
                    { clockIn: { $regex: escapedFilter, $options: 'i' } },
                    { clockOut: { $regex: escapedFilter, $options: 'i' } },
                ]
            });
        }

        if (userId) {
            const escapedFilter = escapeRegex(userId);
            queryConditions.push({
                $or: [
                    { userId: { $regex: escapedFilter, $options: 'i' } },
                ]
            });
        }

        if (queryConditions.length > 0) {
            searchCriteria = { $and: queryConditions };
        }

        const logs = await TransactionLog.find(searchCriteria)
            .populate('userId', 'firstName lastName middleName email username role')
            .sort({ createdAt: -1 });

        const logsWithDuration = logs.map(log => {
            const clockIn = new Date(log.clockIn);
            const clockOut = log.clockOut ? new Date(log.clockOut) : null;
            let duration = null;

            if (clockOut) {
                const diffMs = clockOut - clockIn;
                const totalSeconds = Math.floor(diffMs / 1000);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                duration = `${minutes}m ${seconds}s`;
            }

            return {
                ...log.toObject(),
                duration
            };
        });

        return res.status(200).json(logsWithDuration);

    } catch (error) {
        console.error('Error retrieving transaction logs:', error);
        return res.status(500).json({
            message: "Error in retrieving transaction logs.",
            error: error.message || error
        });
    }
};

exports.enrollSchedule = async (req, res) => {
    try {
        const { id } = req.params; // student ID
        const { courseToTake, section } = req.body; // section comes from request body

        // Find the user
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Step 1: Store only course IDs in courseToTake
        const courseIds = courseToTake.map(c => c._id.toString());
        user.courseToTake = courseIds;

        // Step 2: Find schedules for these courses in the given section
        const schedules = await Schedule.find({
            course: { $in: courseIds },
            section: section
        });

        console.log(schedules);
        // Step 3: Attach schedule IDs to the user
        const scheduleIds = schedules.map(s => s._id.toString());
        user.schedule = scheduleIds;

        // Step 4: Mark the student as enrolled
        user.isEnrolled = true;

        await user.save();

        res.json({
            message: 'Enrollment successful.',
            courseToTake: courseIds,
            schedule: scheduleIds
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error enrolling student.', error });
    }
};

exports.test = async (req, res) => {
    try {
        console.log("test");
        const courseId = "67f1c1c21f8c36d49ef32f12";

        const course = await Program.findById(courseId);
        console.log(course.name);

        // Find all students in the given course
        const students = await User.find({ course: course.name });

        if (!students || students.length === 0) {
            return res.status(404).json({ message: "No students found for this course" });
        }

        res.status(200).json({ count: students.length, students });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};










