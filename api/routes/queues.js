const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/check-auth');

const queueController = require('../controllers/queues');

//routes

router.get('/', queueController.getQueues);

router.get('/current/:destination', queueController.currentInQueue);

router.post('/createQueue', checkAuth, queueController.createQueue);

router.post('/createTransaction', queueController.createTransaction);

router.post('/checkPrerequisites', checkAuth, queueController.checkPrerequisites);

router.post('/updateQueue/:id', checkAuth, queueController.updateQueue);

router.post('/done/:queueId', checkAuth, queueController.doneInQueue);

router.post('/cancel/:queueId', checkAuth, queueController.cancelQueue);

router.put('/next/:queueId', checkAuth, queueController.nextInQueue);


module.exports = router;