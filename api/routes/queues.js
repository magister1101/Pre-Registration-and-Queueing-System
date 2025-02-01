const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/check-auth');

const queueController = require('../controllers/queues');

//routes

router.get('/', queueController.getQueues);

router.get('/current/:destination', queueController.currentInQueue);

router.post('/createQueue', checkAuth, queueController.createQueue);

router.post('/checkPrerequisites', queueController.checkPrerequisites);

router.post('/updateQueue/:id', checkAuth, queueController.updateQueue);

router.put('/next/:queueId', queueController.nextInQueue);


module.exports = router;