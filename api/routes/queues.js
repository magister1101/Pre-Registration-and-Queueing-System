const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/check-auth');

const queueController = require('../controllers/queues');

//routes

router.get('/', checkAuth, queueController.getQueues);

router.post('/checkPrerequisites', queueController.checkPrerequisites);

router.post('/createQueue', checkAuth, queueController.createQueue);

router.post('/updateQueue/:id', checkAuth, queueController.updateQueue);


module.exports = router;