const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true },

    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    middleName: { type: String },
    file: { type: String }, // picture if needed

    role: { type: String, required: true, default: "student" }, //student, instructor, admin
    group: { type: String }, //if instructor this is the department

    courses: [{ type: String, ref: 'Course' }], //if student this is the courses taken
    courseToTake: [{ type: String, ref: 'Course' }], //if student this is the courses to take

    studentNumber: { type: String, unique: true },

    course: { type: String }, //porgram of the student ex. Information technology
    semester: { type: String }, //semester of the program
    year: { type: String }, //year of study
    section: { type: String }, //section of the program

    //for instructor
    window: { type: Number, default: 0 },
    successfulQueue: { type: Number, default: 0 },
    missedQueue: { type: Number, default: 0 },
    transferredQueue: { type: Number, default: 0 },

    isRegular: { type: Boolean },
    isEmailSent: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);