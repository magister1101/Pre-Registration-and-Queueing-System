const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const xlsx = require('xlsx');

const { transporter, customEmailtemplate, generateEmailTemplate, generateEmailTemplateInvalidCredentials } = require('../utils/email');

const User = require('../models/user');
const Course = require('../models/course');
const Semester = require('../models/semester');
const TransactionLog = require('../models/transactionLog');


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
            .populate('schedule', 'code course day startTime endTime')
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
            .populate('courseToTake', 'name code unit course description');

        return res.status(200).json(user);
    } catch (error) {
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
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        const workbook = xlsx.read(req.file.buffer);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet);

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

            if (!studentNumber || !firstName || !lastName) {
                console.log(`Skipping row due to missing required fields:`, row);
                continue;
            }

            let hasInvalidGrade = false;
            const incomingCourses = [];

            // Loop through all possible subject columns
            for (const key of Object.keys(row)) {
                if ([
                    'studentNumber', 'email', 'firstName', 'lastName',
                    'middleName', 'program', 'year', 'section',
                    'isRegular', 'isArchived', 'role'
                ].includes(key)) continue;

                const rawGrade = row[key];
                const grade = parseFloat(rawGrade);

                if (isNaN(grade)) {
                    console.log(`Invalid grade for ${studentNumber} in ${key}: ${rawGrade}`);
                    continue;
                }

                if (grade === 0 || grade > 3) hasInvalidGrade = true;

                const courseData = await Course.findOne({ code: key.trim(), isArchived: false });

                if (!courseData) {
                    console.log(`Course not found in DB: ${key}`);
                    continue;
                }

                incomingCourses.push({
                    courseId: courseData._id,
                    grade
                });
            }

            const hashedPassword = await bcrypt.hash(String(studentNumber), 10);
            const studentName = `${firstName} ${middleName ? middleName + " " : ""}${lastName}`;

            const existingUser = await User.findOne({ studentNumber });

            let finalCourses = incomingCourses;

            if (existingUser && Array.isArray(existingUser.courses)) {
                const existingMap = new Map();

                // Add all existing courses first
                for (const existingCourse of existingUser.courses) {
                    existingMap.set(String(existingCourse.courseId), existingCourse);
                }

                // Overwrite or add new courses from Excel
                for (const newCourse of incomingCourses) {
                    existingMap.set(String(newCourse.courseId), newCourse);
                }

                finalCourses = Array.from(existingMap.values());
            }

            console.log(`Final course list for ${studentNumber}:`, finalCourses);

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
                isRegular: !hasInvalidGrade,
                isArchived: isArchived === true || isArchived === 'true',
                courses: finalCourses,
                courseToTake: [],
                isEmailSent: false
            };

            await User.findOneAndUpdate(
                { studentNumber },
                { $set: update },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }

        res.json({ message: 'Students imported and processed successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
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





