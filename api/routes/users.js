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

router.get('/getTransactionLogs', UsersController.getTransactionLogs);

router.post('/create', UsersController.createUser);

router.post('/update/:userId', UsersController.updateUser);

router.post('/login', UsersController.loginUser);

router.post('/sendEmail/:id', UsersController.sendEmail);

router.post('/enrollRegular/:id', UsersController.enrollRegular)

router.post('/rejectEmail/:id', UsersController.sendEmailReject);

router.post('/excel/insertStudents', upload.single('file'), UsersController.insertStudents);

router.post('/clockIn', UsersController.clockIn);

router.post('/clockOut', UsersController.clockOut);

router.delete('/delete', UsersController.deleteUser);




module.exports = router;