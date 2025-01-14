const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/check-auth');

const CoursesController = require('../controllers/courses')

//routes

router.get('/', CoursesController.getCourse);


module.exports = router;