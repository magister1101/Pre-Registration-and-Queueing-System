const mongoose = require('mongoose');

const Queue = require('../models/queue');
const User = require('../models/user');
const Course = require('../models/course');
const Counter = require('../models/counter');
const { broadcastUpdate } = require('../../websocket');

const { transporter, queueEmailTemplate, queueEmailRejectTemplate } = require('../utils/email');


const destinations = ['registrar', 'admission', 'cashier'];

const performUpdate = (id, updateFields, res) => {
    Queue.findByIdAndUpdate(id, updateFields, { new: true })
        .then((updatedStudent) => {
            if (!updatedStudent) {
                return res.status(404).json({ message: "Queue not found" });
            }
            return updatedStudent;

        })
        .catch((err) => {
            return res.status(500).json({
                message: "Error in updating Queue",
                error: err
            });
        })
};

const performUpdateonUser = (id, updateFields, res) => {
    User.findByIdAndUpdate(id, updateFields, { new: true })
        .then((updatedUser) => {
            if (!updatedUser) {
                return res.status(404).json({ message: "User not found" });
            }
            return updatedUser;

        })
        .catch((err) => {
            return res.status(500).json({
                message: "Error in updating user",
                error: err
            });
        })
};

exports.getQueues = async (req, res) => {
    try {
        const { isArchived, query, filter } = req.query;

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
                { queueNumber: { $regex: escapedQuery, $options: 'i' } },
                { description: { $regex: escapedQuery, $options: 'i' } },
                { status: { $regex: escapedQuery, $options: 'i' } },

            );

            queryConditions.push({ $or: orConditions });
        }

        if (filter) {
            const escapedFilter = escapeRegex(filter);
            queryConditions.push({
                $or: [
                    { status: { $regex: escapedFilter, $options: 'i' } },
                    { destination: { $regex: escapedFilter, $options: 'i' } },
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
        const queues = await Queue.find(searchCriteria)
            .sort({ createdAt: 1 }) // Get the oldest queue first
            .populate('courseToTake', 'name code unit course description')
            .populate('student', 'firstName middleName lastName course year section username email isRegular');

        return res.status(200).json(queues);

    } catch (error) {
        console.error('Error retrieving queues:', error);
        return res.status(500).json({
            message: "Error in retrieving queues",
            error: error.message || error,
        });
    }
};

const { isFailingGrade, isINC } = require('../utils/cvsuGrading');

exports.checkPrerequisites = async (req, res) => {
    try {
        const { selectedCourses, destination, studentId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ message: 'Invalid student ID' });
        }

        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const studentCourses = student.courses || [];
        const passedCourseIds = studentCourses
            .filter(c => {
                const numGrade = parseFloat(c.grade);
                return !isNaN(numGrade) && numGrade <= 3.0 && numGrade !== 0;
            })
            .map(c => c.courseId.toString());

        const incCourseIds = studentCourses
            .filter(c => isINC(c.grade))
            .map(c => c.courseId.toString());

        const failedCourseIds = studentCourses
            .filter(c => isFailingGrade(c.grade))
            .map(c => c.courseId.toString());

        let missingPrerequisites = {};
        let incPrerequisites = {};
        let alreadyTakenCourses = [];

        for (let courseId of selectedCourses) {
            if (!mongoose.Types.ObjectId.isValid(courseId)) continue;
            const courseIdStr = courseId.toString();

            // Check if already passed
            if (passedCourseIds.includes(courseIdStr)) {
                const takenCourse = await Course.findById(courseId);
                if (takenCourse) {
                    alreadyTakenCourses.push({ id: takenCourse._id, name: takenCourse.name });
                }
                continue;
            }

            const course = await Course.findById(courseId);
            if (!course) continue;

            const missing = [];
            const incFound = [];

            for (let prereqId of course.prerequisite) {
                const prereqIdStr = prereqId.toString();

                if (passedCourseIds.includes(prereqIdStr)) {
                    continue; // Passed
                }

                if (selectedCourses.includes(prereqIdStr)) {
                    continue; // Being taken now (concurrent)
                }

                if (incCourseIds.includes(prereqIdStr)) {
                    const prereqCourse = await Course.findById(prereqId);
                    if (prereqCourse) {
                        incFound.push({ id: prereqCourse._id, name: prereqCourse.name });
                    }
                } else {
                    const prereqCourse = await Course.findById(prereqId);
                    if (prereqCourse) {
                        missing.push({ id: prereqCourse._id, name: prereqCourse.name });
                    }
                }
            }

            if (missing.length > 0) {
                missingPrerequisites[course.name] = missing;
            } else if (incFound.length > 0) {
                incPrerequisites[course.name] = incFound;
            }
        }

        if (alreadyTakenCourses.length > 0) {
            return res.status(200).json({
                missing: true,
                message: 'Some courses have already been passed.',
                alreadyTakenCourses
            });
        }

        if (Object.keys(missingPrerequisites).length > 0) {
            return res.status(200).json({
                missing: true,
                message: 'Some prerequisites are missing or failed.',
                missingPrerequisites
            });
        }

        if (Object.keys(incPrerequisites).length > 0) {
            return res.status(200).json({
                missing: false,
                needsAgreement: true,
                message: 'Some prerequisites have Incomplete (INC) grades. You can take the next course but must agree to finish the prerequisite.',
                incPrerequisites
            });
        }

        const updatedUser = await User.findByIdAndUpdate(
            studentId,
            { courseToTake: selectedCourses },
            { new: true }
        );

        return res.status(200).json({
            missing: false,
            message: 'All prerequisites met.',
            studentId,
            selectedCourses: selectedCourses,
            destination
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


exports.createQueue = async (req, res) => {
    try {
        const studentId = req.body.studentId;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ message: 'Invalid student ID' });
        }

        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const studentName = `${student.firstName} ${student.middleName ? student.middleName + " " : ""}${student.lastName}`;
        const recipientEmail = student.email;





        // Find and increment the counter
        const counter = await Counter.findOneAndUpdate(
            { name: 'queueNumber' },
            { $inc: { value: 1 } },
            { new: true, upsert: true }
        );

        const queueNumber = `${counter.value} - ${student.studentNumber}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            replyTo: process.env.EMAIL_USER,
            to: recipientEmail,
            subject: "Account Verification",
            text: queueEmailTemplate(studentName, queueNumber),
            html: queueEmailTemplate(studentName, queueNumber),
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error("Email Error:", err);
                return res.status(500).json({ message: "Failed to send email." });
            }
            console.log("Email sent:", info.response);
            res.status(200).json({ message: "Email sent successfully!" });
        });

        // Count waiting queues
        const waitingQueues = await Queue.countDocuments({ status: 'Waiting' });

        // Calculate estimated waiting time
        const estimatedTimePerQueue = 5;
        const estimatedTime = waitingQueues * estimatedTimePerQueue;

        const newQueue = new Queue({
            _id: new mongoose.Types.ObjectId(),
            queueNumber,
            student: studentId,
            courseToTake: student.courseToTake,
            destination: 'registrar',
            status: 'Waiting',
            estimatedTime
        });

        await newQueue.save();
        return res.status(201).json({ message: 'Queue created successfully', queue: newQueue });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.rejectEnrollment = async (req, res) => {
    try {
        const studentId = req.body.studentId;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ message: "Invalid student ID" });
        }

        // Find student and populate courseToTake & courseToTakeRemoved
        const student = await User.findById(studentId)
            .populate("courseToTake", "name code course unit year semester")
            .populate("courseToTakeRemoved", "name code course unit year semester");

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const studentName = `${student.firstName} ${student.middleName ? student.middleName + " " : ""
            }${student.lastName}`;
        const recipientEmail = student.email;

        // Build courseToTake list
        const toTakeList = student.courseToTake
            .map(
                (c) => `
        <li>
          <strong>${c.name}</strong> (${c.code}) - ${c.course || "Unknown Program"}  
          Year ${c.year || "?"}, ${c.semester || "?"} Semester | ${c.unit || 0} unit(s)
        </li>`
            )
            .join("");

        // Build courseToTakeRemoved list
        const removedList = student.courseToTakeRemoved
            .map(
                (c) => `
        <li style="color:red;">
          <strong>${c.name}</strong> (${c.code}) - ${c.course || "Unknown Program"}  
          Year ${c.year || "?"}, ${c.semester || "?"} Semester | ${c.unit || 0} unit(s)
        </li>`
            )
            .join("");

        // Email HTML
        const emailHtml = `
        <p>Dear ${studentName},</p>
        <p>We regret to inform you that your enrollment has been rejected.</p>
        
        <p><strong>Recommended Courses to Take:</strong></p>
        <ul>
          ${toTakeList || "<li>No courses available.</li>"}
        </ul>
  
        <p><strong style="color:red;">Removed Courses:</strong></p>
        <ul>
          ${removedList || "<li>No removed courses.</li>"}
        </ul>
  
        <p>If you believe this is an error, please contact the registrar.</p>
      `;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            replyTo: process.env.EMAIL_USER,
            to: recipientEmail,
            subject: "Enrollment Rejection Notice",
            html: emailHtml,
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error("Email Error:", err);
                return res.status(500).json({ message: "Failed to send email." });
            }
            console.log("Email sent:", info.response);
            return res
                .status(200)
                .json({ message: "Rejection email sent successfully!" });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error rejecting enrollment", error });
    }
};




exports.createTransaction = async (req, res) => {
    try {
        const destination = req.body.destination;
        const subCategory = req.body.subCategory;

        // Validate destination
        if (!destinations.includes(destination)) {
            return res.status(400).json({ message: 'Invalid destination' });
        }

        // Find and increment the counter for the specific destination
        const counterName = `queueNumber-${destination}`;
        const counter = await Counter.findOneAndUpdate(
            { name: counterName },
            { $inc: { value: 1 } },
            { new: true, upsert: true }
        );

        const queueNumber = `${counter.value}`;

        // Count waiting queues for this specific destination
        const waitingQueues = await Queue.countDocuments({
            status: 'Waiting',
            destination: destination
        });

        // Calculate estimated waiting time
        const estimatedTimePerQueue = 5;
        const estimatedTime = waitingQueues * estimatedTimePerQueue;

        const newQueue = new Queue({
            _id: new mongoose.Types.ObjectId(),
            queueNumber,
            destination,
            subCategory,
            status: 'Waiting',
            estimatedTime
        });

        console.log(newQueue)

        await newQueue.save();

        return res.status(201).json({
            message: 'Queue created successfully',
            queue: newQueue
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.nextInQueue = async (req, res) => {
    try {
        const { queueId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(queueId)) {
            return res.status(400).json({ message: 'Invalid queue ID' });
        }

        const queue = await Queue.findById(queueId);
        if (!queue) {
            return res.status(404).json({ message: 'Queue not found' });
        }

        const currentIndex = destinations.indexOf(queue.destination);
        if (currentIndex === -1) {
            return res.status(400).json({ message: 'Invalid destination' });
        }

        if (currentIndex === destinations.length - 1) {
            queue.status = 'Completed';
            queue.isArchived = true;
        } else {
            queue.destination = destinations[currentIndex + 1];
            queue.queueNumber = `${Date.now()}`;
        }

        await queue.save();
        const queues = await Queue.find().sort({ createdAt: 1 }) //get all ques

        broadcastUpdate({ event: 'queueUpdated', queues });

        const getUserSuccessfulQueue = await User.findOne({ _id: req.userData.userId })
        const addOne = getUserSuccessfulQueue.transferredQueue + 1;
        const updatedUser = performUpdateonUser(req.userData.userId, { transferredQueue: addOne }, res);

        return res.status(200).json({ message: 'Queue moved to next destination', queue });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.doneInQueue = async (req, res) => {
    try {
        const { queueId } = req.params;
        const updateFields = { status: 'Completed' };

        const updatedQueue = performUpdate(queueId, updateFields, res);
        const getUserSuccessfulQueue = await User.findOne({ _id: req.userData.userId })
        const addOne = getUserSuccessfulQueue.successfulQueue + 1;
        const updatedUser = performUpdateonUser(req.userData.userId, { successfulQueue: addOne }, res);
        return res.status(200).json(updatedQueue);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'error in doneInQueue' });
    }
};

exports.cancelQueue = async (req, res) => {
    try {
        const { queueId } = req.params;
        const updateFields = { status: 'Cancelled' };

        const updatedQueue = performUpdate(queueId, updateFields, res);
        const getUserSuccessfulQueue = await User.findOne({ _id: req.userData.userId })
        const addOne = getUserSuccessfulQueue.missedQueue + 1;
        const updatedUser = performUpdateonUser(req.userData.userId, { missedQueue: addOne }, res);
        return res.status(200).json(updatedQueue);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'error in doneInQueue' });
    }
};

exports.currentInQueue = async (req, res) => {
    try {
        const { destination } = req.params;

        if (!destinations.includes(destination)) {
            return res.status(400).json({ message: 'Invalid destination' });
        }

        const currentQueue = await Queue.find({ destination, status: 'Waiting' })
            .sort({ priority: -1, createdAt: 1 }) // Prioritize priority=true, then by creation time
            .populate('courseToTake', 'name code unit course description')
            .populate({
                path: 'student',
                select: 'firstName lastName course year section username email isRegular schedule',
                populate: {
                    path: 'schedule',
                    select: 'code course section schedule'
                }
            });

        if (!currentQueue || currentQueue.length === 0) {
            return res.status(200).json({
                currentQueue: {
                    message: 'No queue at this destination',
                    queueNumber: "None"
                }
            });
        }

        return res.status(200).json({ currentQueue });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.resetQueues = async (req, res) => {
    try {
        await Counter.updateMany({}, { value: 0 });

        await Queue.updateMany({ status: { $ne: 'Done' } }, { status: 'Done' });

        return res.status(200).json({ message: 'Queues reset and counters set to 0 successfully.' });
    } catch (err) {
        console.error('Error resetting queues:', err);
        return res.status(500).json({ message: 'An error occurred while resetting queues and counters.' });
    }
};

exports.updateQueue = async (req, res) => {
    try {
        const queueId = await req.params.id;
        const updateFields = await req.body;

        const updatedQueue = performUpdate(queueId, updateFields, res);
        return res.status(200).json(updatedQueue);
    }
    catch (error) {
        console.error('Error updating course:', error);
        return res.status(500).json({
            message: "Error in updating course",
            error: error.message || error,
        });
    }
};
