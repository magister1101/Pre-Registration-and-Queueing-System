
const mongoose = require('mongoose');

const Course = require('../models/course');
const Schedule = require('../models/schedule');
const Program = require('../models/program');
const Semester = require('../models/semester');
const SchedCounter = require('../models/schedCounter')
const schedule = require('../models/schedule');
const xlsx = require('xlsx');


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
            .populate('prerequisite', 'name code semester');

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

exports.updateSchedule = async (req, res) => {
    try {
        const scheduleId = req.params.scheduleId;
        const updateFields = req.body;

        const updatedSchedule = await Schedule.findByIdAndUpdate(
            scheduleId,
            updateFields,
            { new: true }
        ).populate('course', 'name code');

        if (!updatedSchedule) {
            return res.status(404).json({ message: "Schedule not found" });
        }

        return res.status(200).json({
            message: "Schedule updated successfully",
            schedule: updatedSchedule,
        });
    } catch (error) {
        console.error('Error updating schedule:', error);
        return res.status(500).json({
            message: "Error in updating schedule",
            error: error.message || error,
        });
    }
};

exports.deleteSchedule = async (req, res) => {
    try {
        const scheduleId = req.params.scheduleId;

        const deletedSchedule = await Schedule.findByIdAndDelete(scheduleId);

        if (!deletedSchedule) {
            return res.status(404).json({ message: "Schedule not found" });
        }

        return res.status(200).json({
            message: "Schedule deleted successfully",
            schedule: deletedSchedule,
        });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        return res.status(500).json({
            message: "Error in deleting schedule",
            error: error.message || error,
        });
    }
};

exports.insertSchedules = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded." });
        }

        // Read uploaded Excel
        const workbook = xlsx.read(req.file.buffer);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet);

        // Validate structure
        if (
            !rows[0] ||
            !("code" in rows[0]) ||
            !("course" in rows[0]) ||
            !("section" in rows[0]) ||
            !("room" in rows[0]) ||
            !("day" in rows[0]) ||
            !("startTime" in rows[0]) ||
            !("endTime" in rows[0])
        ) {
            return res.status(400).json({
                error:
                    "Invalid Excel format. Columns must be: code, course, section, room, day, startTime, endTime",
            });
        }

        // Group schedules by code + section
        const groupedSchedules = {};

        for (const row of rows) {
            const { code, course, section, room, day, startTime, endTime } = row;

            if (!code || !course || !section) continue;

            // 🔍 Find the course by its code
            const courseDoc = await Course.findOne({ code: course });
            if (!courseDoc) {
                console.log(`Skipping row: Course ${course} not found`);
                continue;
            }

            const key = `${code}-${section}`;
            if (!groupedSchedules[key]) {
                groupedSchedules[key] = {
                    _id: new mongoose.Types.ObjectId(),
                    code,
                    course: courseDoc._id,
                    section,
                    schedule: [],
                };
            }

            groupedSchedules[key].schedule.push({
                room,
                day,
                startTime,
                endTime,
            });
        }

        // Save to DB
        const schedules = Object.values(groupedSchedules);
        await Schedule.insertMany(schedules);

        res.json({ message: "Schedules imported successfully", count: schedules.length });
    } catch (error) {
        console.error("Error importing schedules:", error);
        res.status(500).json({ error: "Error importing schedules" });
    }
};

exports.testFunction = async (req, res) => {

    try {
        const number = 2;

        if (number === 1) {
            return res.status(400).json({
                message: "Number is equal to 1",
            });
        } else {
            return res.status(200).json({
                message: "Number is not equal to 1",
            });
        }

        return res.status(200).json({
            message: "ito value",
            number: number,
        });


    }
    catch (error) {
        console.error('Error in test function:', error);
        return res.status(500).json({
            message: "pre di ko talaga alam",
            error: error.message || error,
        });
    }

};

exports.insertScheduleFromExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded." });
        }

        /* ===============================
           🔹 GET SEMESTER INFO
        =============================== */

        const currentYear = new Date().getFullYear();

        const semesterDoc = await Semester.findOne();
        if (!semesterDoc) {
            return res.status(400).json({ message: "No semester found" });
        }

        const semesterName = semesterDoc.semester.trim().toLowerCase();

        const semesterMap = {
            first: "0",
            second: "1",
            summer: "2",
        };

        const semCode = semesterMap[semesterName];
        if (semCode === undefined) {
            return res.status(400).json({
                message: `Invalid semester value: ${semesterDoc.semester}`
            });
        }

        /* ===============================
           🔹 READ EXCEL
        =============================== */

        const workbook = xlsx.read(req.file.buffer);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

        if (!rows.length) {
            return res.status(400).json({ message: "Excel file is empty" });
        }

        /* ===============================
           🔹 VALIDATE REQUIRED HEADERS
        =============================== */

        const requiredHeaders = ["code", "course", "section", "room", "day", "startTime", "endTime"];
        const excelHeaders = Object.keys(rows[0]);

        const missingHeaders = requiredHeaders.filter(h => !excelHeaders.includes(h));
        if (missingHeaders.length) {
            return res.status(400).json({
                message: "Invalid Excel format",
                missingHeaders
            });
        }

        /* ===============================
           🔹 GET COURSE IDS FOR ALL COURSES IN EXCEL
        =============================== */

        // Collect all unique subject codes from Excel
        const courseCodes = [...new Set(rows.map(r => r.code).filter(Boolean))];
        
        // Find all courses at once for better performance
        const courses = await Course.find({ code: { $in: courseCodes } });
        
        // Check if Excel has a "program" column (case-insensitive)
        const hasProgramColumn = excelHeaders.some(h => h.toLowerCase() === 'program');
        
        // Group courses by code to check for duplicates
        const coursesByCode = {};
        for (const course of courses) {
            if (!coursesByCode[course.code]) {
                coursesByCode[course.code] = [];
            }
            coursesByCode[course.code].push(course);
        }
        
        // Helper function to find course ID for a row
        const findCourseId = (row) => {
            const courseCode = row.code;
            if (!courseCode) return null;
            
            const matchingCourses = coursesByCode[courseCode] || [];
            
            if (matchingCourses.length === 0) {
                return null;
            }
            
            // If only one course with this code, use it
            if (matchingCourses.length === 1) {
                return matchingCourses[0]._id;
            }
            
            // Multiple courses with same code - need to match by program
            let matchedCourse = null;
            
            if (hasProgramColumn && row.program) {
                // Try to match by program column from Excel
                matchedCourse = matchingCourses.find(c => 
                    c.course && c.course.trim().toUpperCase() === String(row.program).trim().toUpperCase()
                );
            } else if (row.course) {
                // Try to match by "course" column (might be program name)
                matchedCourse = matchingCourses.find(c => 
                    c.course && c.course.trim().toUpperCase() === String(row.course).trim().toUpperCase()
                );
            }
            
            if (matchedCourse) {
                return matchedCourse._id;
            }
            
            // If no match found, return null (will be handled as missing/ambiguous)
            return null;
        };
        
        // Check for missing and ambiguous courses
        const missingCourses = [];
        const ambiguousCourses = new Set();
        
        for (const row of rows) {
            const courseCode = row.code;
            if (!courseCode) continue;
            
            const courseId = findCourseId(row);
            if (!courseId) {
                const matchingCourses = coursesByCode[courseCode] || [];
                if (matchingCourses.length === 0) {
                    if (!missingCourses.includes(courseCode)) {
                        missingCourses.push(courseCode);
                    }
                } else if (matchingCourses.length > 1) {
                    ambiguousCourses.add(courseCode);
                }
            }
        }

        if (missingCourses.length > 0) {
            console.log("Missing courses:", missingCourses);
            return res.status(400).json({
                message: "Some courses do not exist in the database",
                missingCourses
            });
        }
        
        if (ambiguousCourses.size > 0 && !hasProgramColumn) {
            const ambiguousList = Array.from(ambiguousCourses).map(code => {
                const matchingCourses = coursesByCode[code] || [];
                return {
                    code: code,
                    availablePrograms: matchingCourses.map(c => c.course).filter(Boolean)
                };
            });
            console.log("Ambiguous courses (multiple programs found):", ambiguousList);
            return res.status(400).json({
                message: "Some course codes exist in multiple programs. Please add a 'program' column to your Excel file with values like 'BEE', 'BSIT', etc.",
                ambiguousCourses: ambiguousList
            });
        }

        /* ===============================
           🔹 GROUP BY SECTION AND PREPARE FOR SCHEDULE GENERATION
        =============================== */

        const scheduleGroups = []; // Array to hold grouped schedules

        for (const row of rows) {
            const { code: courseCode, course: courseName, section, room, day, startTime, endTime } = row;

            if (!courseCode || !section || !room || !day || !startTime || !endTime) {
                console.log("Skipping invalid row:", row);
                continue;
            }

            // Find course ID using the helper function (considers program if available)
            const courseId = findCourseId(row);
            if (!courseId) {
                console.log(`Course ID not found for code: ${courseCode}`);
                continue;
            }
            
            // Get the actual course to use its name
            const actualCourse = courses.find(c => c._id.toString() === courseId.toString());
            const displayCourseName = actualCourse ? actualCourse.name : courseName;

            // Find existing group for this course-section combination
            let group = scheduleGroups.find(g => 
                g.courseId.toString() === courseId.toString() && 
                g.section === section
            );

            if (!group) {
                group = {
                    courseId: courseId,
                    courseCode: courseCode,
                    courseName: displayCourseName,
                    section: section,
                    scheduleItems: []
                };
                scheduleGroups.push(group);
            }

            group.scheduleItems.push({
                room: room.trim(),
                day: day.trim(),
                startTime: startTime.trim(),
                endTime: endTime.trim()
            });
        }

        /* ===============================
           🔹 GENERATE UNIQUE CODES FOR EACH SECTION
        =============================== */

        // Get current counter value
        let counter = await SchedCounter.findOne();
        if (!counter) {
            counter = new SchedCounter({ value: 0 });
        }

        const savedSchedules = [];

        // Generate unique code for each group
        for (const group of scheduleGroups) {
            // Increment counter for each new schedule
            counter.value += 1;
            await counter.save();

            const counterPadded = String(counter.value).padStart(5, "0");
            const generatedCode = `${currentYear}${semCode}${counterPadded}`;

            /* ===============================
               🔹 SAVE TO DB WITH UNIQUE CODE
            =============================== */

            const scheduleDoc = new Schedule({
                _id: new mongoose.Types.ObjectId(),
                code: generatedCode, // Unique code for each section
                course: group.courseId,
                section: group.section,
                schedule: group.scheduleItems
            });

            const saved = await scheduleDoc.save();
            savedSchedules.push({
                ...saved.toObject(),
                courseCode: group.courseCode,
                courseName: group.courseName
            });
        }

        return res.status(200).json({
            message: "Schedules imported successfully.",
            count: savedSchedules.length,
            data: savedSchedules.map(s => ({
                scheduleId: s._id,
                code: s.code,
                courseCode: s.courseCode,
                courseName: s.courseName,
                section: s.section,
                scheduleItems: s.schedule.length
            }))
        });

    } catch (error) {
        console.error("Insert Schedule Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};







