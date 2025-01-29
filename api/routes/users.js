const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/check-auth');

const UsersController = require('../controllers/users');

//routes

router.get('/', UsersController.getUser);

router.get('/tokenValidation', UsersController.tokenValidation);

router.post('/create', UsersController.createUser);

router.post('/update/:userId', UsersController.updateUser);

router.post('/login', UsersController.loginUser);



module.exports = router;