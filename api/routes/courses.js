const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/check-auth');

const CoursesController = require('../controllers/courses')

//routes

router.get('/', CoursesController.getCourse);

router.get('/getPrerequisite', CoursesController.getPrerequisite);

router.post('/createCourse', CoursesController.createCourse);

module.exports = router;