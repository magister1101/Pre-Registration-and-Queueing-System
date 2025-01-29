const mongoose = require('mongoose');

const Queue = require('../models/queue');
const Student = require('../models/student');
const User = require('../models/user');
const Course = require('../models/course');

const performUpdate = (id, updateFields, res) => {
    Queue.findByIdAndUpdate(id, updateFields, { new: true })
        .then((updatedStudent) => {
            if (!updatedStudent) {
                return res.status(404).json({ message: "User not found" });
            }
            return updatedStudent;

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
                { student: { $regex: escapedQuery, $options: 'i' } },
                { description: { $regex: escapedQuery, $options: 'i' } },
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
        const queues = await Queue.find(searchCriteria);

        return res.status(200).json(queues);

    } catch (error) {
        console.error('Error retrieving queues:', error);
        return res.status(500).json({
            message: "Error in retrieving queues",
            error: error.message || error,
        });
    }
};
//     try {
//         const _id = req.params.id;
//         const student = new Student({
//             _id: _id,
//             firstName: req.body.firstName,
//             lastName: req.body.lastName,
//             middleName: req.body.middleName,

//             course: req.body.course,
//             year: req.body.year,
//             section: req.body.section,

//             semester: req.body.semester,
//         });

//         const saveStudent = await student.save();

//         //que number should be created first, then update it and put student id there
//         return res.status(201).json({
//             message: "Student created successfully",
//             student: saveStudent
//         });
//     }
//     catch (error) {
//         console.error('Error creating student:', error);
//         return res.status(500).json({
//             message: "Error in creating student",
//             error: error.message || error,
//         });
//     }
// };

// exports.checkPrerequisites = async (req, res) => {
//     try {
//         const studentId = req.userData.userId
//         console.log(studentId);
//         const { subjectsToEnroll } = req.body;

//         // Fetch student details
//         const student = await Student.findById(studentId);
//         if (!student) {
//             return res.status(404).json({ message: 'Student not found' });
//         }

//         // Fetch courses student has already taken
//         const user = await User.findById(studentId);
//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }
//         const completedCourses = user.courses || [];

//         let missingPrerequisites = {};

//         for (const courseId of subjectsToEnroll) {
//             const course = await Course.findById(courseId);
//             if (!course) {
//                 return res.status(404).json({ message: `Course with ID ${courseId} not found` });
//             }

//             const unmetPrerequisites = course.prerequisite.filter(prereq => !completedCourses.includes(prereq));

//             if (unmetPrerequisites.length > 0) {
//                 missingPrerequisites[course.name] = unmetPrerequisites;
//             }
//         }

//         if (Object.keys(missingPrerequisites).length > 0) {
//             return res.status(400).json({ message: 'Missing prerequisites', missingPrerequisites });
//         }

//         return res.status(200).json({ message: 'All prerequisites met. You can enroll.' });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// };

exports.checkPrerequisites = async (req, res) => {
    try {
        const { studentId, selectedCourses, destination } = req.body;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ message: 'Invalid student ID' });
        }

        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const studentCourses = student.courses || [];
        let missingPrerequisites = {};
        let metCourses = [];

        for (let courseId of selectedCourses) {
            if (!mongoose.Types.ObjectId.isValid(courseId)) continue;

            const course = await Course.findById(courseId);
            if (!course) continue;

            const missing = [];
            for (let prereqId of course.prerequisite) {
                if (!studentCourses.includes(prereqId)) {
                    const prereqCourse = await Course.findById(prereqId);
                    if (prereqCourse) {
                        missing.push({ id: prereqCourse._id, name: prereqCourse.name });
                    }
                }
            }

            if (missing.length > 0) {
                missingPrerequisites[course.name] = missing;
            } else {
                metCourses.push({ id: course._id, name: course.name });
            }
        }

        if (Object.keys(missingPrerequisites).length > 0) {
            return res.status(400).json({
                message: 'Some prerequisites are missing.',
                missingPrerequisites
            });
        }

        return res.status(200).json({
            message: 'All prerequisites met. Student can enroll in selected courses.',
            studentId,
            selectedCourses: metCourses,
            destination
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createQueue = async (req, res) => {
    try {
        const studentId = req.userData.userId;
        const { selectedCourses, destination } = req.body;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ message: 'Invalid student ID' });
        }

        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const queueNumber = `Q-${Date.now()}`;

        const newQueue = new Queue({
            _id: new mongoose.Types.ObjectId(),
            queueNumber,
            student: studentId,
            courseToTake: selectedCourses,
            destination,
            status: 'Waiting'
        });

        await newQueue.save();
        return res.status(201).json({ message: 'Queue created successfully', queue: newQueue });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

