const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/check-auth');

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });


const UsersController = require('../controllers/users');


//routes

router.get('/', UsersController.getUser);

router.get('/myProfile', checkAuth, UsersController.myProfile);

router.get('/tokenValidation', UsersController.tokenValidation);

router.get('/resetQueue', checkAuth, UsersController.resetQueueCounter);

router.post('/create', UsersController.createUser);

router.post('/update/:userId', UsersController.updateUser);

router.post('/login', UsersController.loginUser);

router.post('/sendEmail/:id', UsersController.sendEmail);

router.post('/enrollRegular/:id', UsersController.enrollRegular)

router.post('/rejectEmail/:id', UsersController.sendEmailReject);

router.post('/excel/insertStudents', upload.single('file'), UsersController.insertStudents);

router.delete('/delete', UsersController.deleteUser);




module.exports = router;