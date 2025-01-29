const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/check-auth');

const queueController = require('../controllers/queues');


//routes

router.get('/', checkAuth, queueController.getQueues);

router.get('/checkPrerequisites', queueController.checkPrerequisites)

router.post('/createQueue', checkAuth, queueController.createQueue)


module.exports = router;