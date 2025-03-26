
const mongoose = require('mongoose');

const Course = require('../models/course');
const Program = require('../models/program');

const performUpdate = (id, updateFields, res) => {
    Course.findByIdAndUpdate(id, updateFields, { new: true })
        .then((updatedCourse) => {
            if (!updatedCourse) {
                return { message: "Course not found" };
            }
            return updatedCourse;

        })
        .catch((err) => {
            return ({
                message: "Error in updating Course",
                error: err
            });
        })
};

const performUpdateProgram = (id, updateFields, res) => {
    Program.findByIdAndUpdate(id, updateFields, { new: true })
        .then((updatedProgram) => {
            if (!updatedProgram) {
                return { message: "Program not found" };
            }
            return updatedProgram;

        })
        .catch((err) => {
            return ({
                message: "Error in updating Program",
                error: err
            });
        })
};

exports.getCourse = async (req, res) => {
    try {
        const { isArchived, query, filter, program } = req.query;

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
                { name: { $regex: escapedQuery, $options: 'i' } },
                { section: { $regex: escapedQuery, $options: 'i' } },
                { description: { $regex: escapedQuery, $options: 'i' } },
            );

            queryConditions.push({ $or: orConditions });
        }

        if (filter) {
            const escapedFilter = escapeRegex(filter);
            queryConditions.push({
                $or: [
                    { prerequisite: { $regex: escapedFilter, $options: 'i' } },
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

        if (isArchived) {
            const isArchivedBool = isArchived === 'true'; // Convert to boolean
            queryConditions.push({ isArchived: isArchivedBool });
        }

        if (queryConditions.length > 0) {
            searchCriteria = { $and: queryConditions };
        }
        const courses = await Course.find(searchCriteria)
            .populate('prerequisite', 'name code');

        return res.status(200).json(courses);

    } catch (error) {
        console.error('Error retrieving courses:', error);
        return res.status(500).json({
            message: "Error in retrieving courses",
            error: error.message || error,
        });
    }
};

exports.getProgram = async (req, res) => {
    try {
        const { isArchived, query } = req.query;

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
                { name: { $regex: escapedQuery, $options: 'i' } },
                { code: { $regex: escapedQuery, $options: 'i' } },
            );

            queryConditions.push({ $or: orConditions });
        }

        if (isArchived) {
            const isArchivedBool = isArchived === 'true'; // Convert to boolean
            queryConditions.push({ isArchived: isArchivedBool });
        }

        if (queryConditions.length > 0) {
            searchCriteria = { $and: queryConditions };
        }
        const programs = await Program.find(searchCriteria);

        return res.status(200).json(programs);

    } catch (error) {
        console.error('Error retrieving programs:', error);
        return res.status(500).json({
            message: "Error in retrieving programs",
            error: error.message || error,
        });
    }
};

exports.getPrerequisite = async (req, res) => {
    try {
        const { courseId, isArchived, query, filter } = req.query;

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
                { name: { $regex: escapedQuery, $options: 'i' } },
                { section: { $regex: escapedQuery, $options: 'i' } },
                { description: { $regex: escapedQuery, $options: 'i' } },
            );

            queryConditions.push({ $or: orConditions });
        }

        if (courseId) {
            const escapedCourseId = escapeRegex(courseId);
            const orConditions = [];

            if (mongoose.Types.ObjectId.isValid(courseId)) {
                orConditions.push({ _id: courseId });
            }
            orConditions.push(
                { name: { $regex: escapedCourseId, $options: 'i' } },
                { section: { $regex: escapedCourseId, $options: 'i' } },
                { description: { $regex: escapedCourseId, $options: 'i' } },
            );

            queryConditions.push({ $or: orConditions });
        }

        if (filter) {
            const escapedFilter = escapeRegex(filter);
            queryConditions.push({
                $or: [
                    { prerequisite: { $regex: escapedFilter, $options: 'i' } },
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
        const courses = await Course.find(searchCriteria, 'name prerequisite');

        return res.status(200).json(courses);

    } catch (error) {
        console.error('Error retrieving courses:', error);
        return res.status(500).json({
            message: "Error in retrieving courses",
            error: error.message || error,
        });
    }
};

exports.createCourse = async (req, res) => {
    try {
        const courseId = new mongoose.Types.ObjectId();

        const course = new Course({
            _id: courseId,
            name: req.body.name,
            code: req.body.code,
            unit: req.body.unit,
            year: req.body.year,
            course: req.body.course,
            description: req.body.description,
            prerequisite: req.body.prerequisite,
            file: req.body.file,
            isArchived: false,
        })

        const saveCourse = await course.save();
        return res.status(201).json({
            message: "Course created successfully",
            course: saveCourse
        });

    }
    catch (error) {
        console.error('Error creating course:', error);
        return res.status(500).json({
            message: "Error in creating course",
            error: error.message || error,
        });
    }
};

exports.createProgram = async (req, res) => {
    try {
        const programId = new mongoose.Types.ObjectId();

        const program = new Program({
            _id: programId,
            name: req.body.name,
            code: req.body.code,
            file: req.body.file,
            isArchived: false,
        })

        const saveProgram = await program.save();
        return res.status(201).json({
            message: "Program created successfully",
            program: saveProgram
        });

    }
    catch (error) {
        console.error('Error creating program:', error);
        return res.status(500).json({
            message: "Error in creating program",
            error: error.message || error,
        });
    }
};

exports.updateProgram = async (req, res) => {
    try {

        const programId = await req.params.programId;
        const updateFields = await req.body;

        const updatedProgram = performUpdateProgram(programId, updateFields, res);
        return res.status(200).json(updatedProgram);
    }
    catch (error) {
        console.error('Error updating program:', error);
        return res.status(500).json({
            message: "Error in updating program",
            error: error.message || error,
        });
    }
};

exports.updateCourse = async (req, res) => {
    try {

        // const userId = await req.userData.userId;
        const courseId = await req.params.courseId;
        const course = await Course.findOne({ _id: courseId }).exec();
        const updateFields = await req.body;

        const updatedCourse = performUpdate(courseId, updateFields, res);
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
