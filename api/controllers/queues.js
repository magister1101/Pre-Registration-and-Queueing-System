const mongoose = require('mongoose');

const Queue = require('../models/queue');
const User = require('../models/user');
const Course = require('../models/course');


const destinations = ['registrar', 'osas', 'cashier'];

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
            .populate('courseToTake', 'name')
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

exports.checkPrerequisites = async (req, res) => {
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
            return res.status(200).json({
                missing: true,
                message: 'Some prerequisites are missing.',
                missingPrerequisites
            });
        }

        return res.status(200).json({
            missing: false,
            message: 'All prerequisites met.',
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
        const { selectedCourses } = req.body;

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
            destination: 'registrar',
            status: 'Waiting'
        });

        await newQueue.save();
        return res.status(201).json({ message: 'Queue created successfully', queue: newQueue });
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
            queue.queueNumber = `Q-${Date.now()}`;
        }

        await queue.save();
        return res.status(200).json({ message: 'Queue moved to next destination', queue });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.currentInQueue = async (req, res) => {
    try {
        const { destination } = req.params;

        if (!destinations.includes(destination)) {
            return res.status(400).json({ message: 'Invalid destination' });
        }

        const currentQueue = await Queue.find({ destination, status: 'Waiting' })
            .sort({ createdAt: 1 })
            .populate('courseToTake', 'name')
            .populate('student', 'firstName lastName course year section username email isRegular');

        if (!currentQueue) {
            return res.status(404).json({ message: 'No queue at this destination' });
        }

        return res.status(200).json({ currentQueue });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateQueue = async (req, res) => {
    try {

        const queueId = await req.params.id;
        const updateFields = await req.body;

        const updatedCourse = performUpdate(queueId, updateFields, res);
        return res.status(200).json(updatedCourse);
    }
    catch (error) {
        console.error('Error updating course:', error);
        return res.status(500).json({
            message: "Error in updating course",
            error: error.message || error,
        });
    }
};
