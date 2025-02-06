const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/check-auth');

const UsersController = require('../controllers/users');
const user = require('../models/user');

//routes

router.get('/', UsersController.getUser);

router.get('/myProfile', checkAuth, UsersController.myProfile);

router.get('/tokenValidation', UsersController.tokenValidation);

router.get('/resetQueue', checkAuth, UsersController.resetQueueCounter);

router.post('/create', UsersController.createUser);

router.post('/update/:userId', UsersController.updateUser);

router.post('/login', UsersController.loginUser);

router.post('/sendEmail/:id', UsersController.sendEmail);





module.exports = router;