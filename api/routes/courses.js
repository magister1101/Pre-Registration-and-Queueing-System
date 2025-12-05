const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/check-auth');

const CoursesController = require('../controllers/courses')

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

//routes

router.get('/', CoursesController.getCourse);

router.get('/testFunction', CoursesController.testFunction);

router.get('/getSchedule', CoursesController.getSchedule);

router.get('/getProgram', CoursesController.getProgram);

router.get('/getPrerequisite', CoursesController.getPrerequisite);

router.get('/getSemester', CoursesController.getSemester)

router.post('/createCourse', CoursesController.createCourse);

router.post('/createSchedule', CoursesController.createSchedule);

router.put('/schedule/:scheduleId', CoursesController.updateSchedule);

router.delete('/schedule/:scheduleId', CoursesController.deleteSchedule);

router.post("/excel/importSchedules", upload.single("file"), CoursesController.insertScheduleFromExcel);

router.post('/createProgram', CoursesController.createProgram);

router.post('/changeSemester/:id', CoursesController.changeSemester)

router.post('/updateProgram/:programId', CoursesController.updateProgram);

router.post('/updateCourse/:courseId', CoursesController.updateCourse);

module.exports = router;