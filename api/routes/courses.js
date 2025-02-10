const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/check-auth');

const CoursesController = require('../controllers/courses')

//routes

router.get('/', CoursesController.getCourse);

router.get('/getProgram', CoursesController.getProgram);

router.get('/getPrerequisite', CoursesController.getPrerequisite);

router.post('/createCourse', CoursesController.createCourse);

router.post('/createProgram', CoursesController.createProgram);

router.post('/updateProgram/:programId', CoursesController.updateProgram);

router.post('/updateCourse/:courseId', CoursesController.updateCourse);

module.exports = router;