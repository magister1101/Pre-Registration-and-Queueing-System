
const mongoose = require('mongoose');

const Course = require('../models/course');
const Schedule = require('../models/schedule');
const Program = require('../models/program');
const Semester = require('../models/semester');
const SchedCounter = require('../models/schedCounter')
const schedule = require('../models/schedule');


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
        const { isArchived, query, filter, program, year, semester } = req.query;

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

        if (year) {
            const escapedProgram = escapeRegex(year);
            queryConditions.push({
                $or: [
                    { year: { $regex: escapedProgram, $options: 'i' } },
                ],
            });
        }

        if (semester) {
            const escapedProgram = escapeRegex(semester);
            queryConditions.push({
                $or: [
                    { semester: { $regex: escapedProgram, $options: 'i' } },
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

exports.getSchedule = async (req, res) => {
    try {
        const { isArchived, query, course, schedule, program } = req.query;

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



        if (course) {
            const escapedCourse = escapeRegex(course);
            queryConditions.push({
                $or: [
                    { course: { $regex: escapedCourse, $options: 'i' } },
                ],
            });
        }

        if (program) {
            const escapedProgram = escapeRegex(program);

            // Find all matching courses first
            const matchedPrograms = await Course.find({
                $or: [
                    { name: { $regex: escapedProgram, $options: 'i' } },
                    { code: { $regex: escapedProgram, $options: 'i' } },
                    { course: { $regex: escapedProgram, $options: 'i' } } // program name
                ]
            }).select('_id');

            const courseIds = matchedPrograms.map(c => c._id);

            // If no matching courses, force no results
            if (courseIds.length > 0) {
                queryConditions.push({ course: { $in: courseIds } });
            } else {
                queryConditions.push({ course: { $in: [] } });
            }
        }



        if (schedule) {
            const escapedSchedule = escapeRegex(schedule);
            queryConditions.push({
                $or: [
                    { schedule: { $regex: escapedSchedule, $options: 'i' } },
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
        const schedules = await Schedule.find(searchCriteria)
            .populate('course', 'name code unit course');

        return res.status(200).json(schedules);

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
            semester: req.body.semester,
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

exports.createSchedule = async (req, res) => {
    try {
        const scheduleId = new mongoose.Types.ObjectId();

        // Get current year
        const currentYear = new Date().getFullYear();

        // Get current semester from DB (assuming only one active semester document)
        const semesterDoc = await Semester.findOne();
        if (!semesterDoc) {
            return res.status(400).json({ message: "No semester found" });
        }

        // Normalize semester name
        const semesterName = semesterDoc.semester.trim().toLowerCase();

        const semesterMap = {
            first: "0",
            second: "1",
            summer: "2",
        };

        const semCode = semesterMap[semesterName];
        if (semCode === undefined) {
            return res.status(400).json({ message: `Invalid semester value: ${semesterDoc.semester}` });
        }


        // Increment schedule counter
        let counter = await SchedCounter.findOne();
        if (!counter) {
            counter = new SchedCounter({ value: 0 });
        }
        counter.value += 1;
        await counter.save();

        // Pad counter to 5 digits
        const counterPadded = String(counter.value).padStart(5, '0');

        // Final generated code
        const generatedCode = `${currentYear}${semCode}${counterPadded}`;

        // Create schedule
        const schedule = new Schedule({
            _id: scheduleId,
            course: req.body.course,
            code: generatedCode,
            section: req.body.section,
            schedule: req.body.schedule,
        });

        const saveSchedule = await schedule.save();
        return res.status(201).json({
            message: "Schedule created successfully",
            schedule: saveSchedule
        });

    } catch (error) {
        console.error('Error creating schedule:', error);
        return res.status(500).json({
            message: "Error in creating schedule",
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

exports.getSemester = async (req, res) => {
    try {
        const semseter = await Semester.find();
        if (semseter.length === 0) {
            const newSemester = new Semester({
                _id: new mongoose.Types.ObjectId(),
                Semester: 'first'
            })
            const saveSemester = await newSemester.save();
            return res.status(201).json({
                message: "Semester created successfully",
                semester: saveSemester
            });
        }

        return res.status(200).json(semseter);

    }
    catch (error) {
        console.error('Error retrieving semester:', error);
        return res.status(500).json({
            message: "Error in retrieving semester",
            error: error.message || error,
        });
    }
};

exports.changeSemester = async (req, res) => {
    try {
        const id = req.params.id;
        const oldSemester = await Semester.findById(id);

        if (!oldSemester) {
            return res.status(404).json({ message: "Semester not found" });
        }

        let newSemester;

        switch (oldSemester.semester) {
            case 'First':
                newSemester = 'Second';
                break;
            case 'Second':
                newSemester = 'Summer';
                break;
            case 'Summer':
                newSemester = 'First';
                break;
            default:
                return res.status(400).json({ message: "Invalid current semester value" });
        }

        oldSemester.semester = newSemester;
        const updatedSemester = await oldSemester.save();

        return res.status(200).json({
            message: "Semester changed successfully",
            semester: updatedSemester
        });

    } catch (err) {
        console.error('Error changing semester:', err);
        return res.status(500).json({
            message: "Error in changing semester",
            error: err.message || err,
        });
    }
};



