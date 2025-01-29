const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },

    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    middleName: { type: String },
    file: { type: String }, // picture if needed

    role: { type: String, required: true, default: "student" }, //student, instructor, admin
    group: { type: String }, //if instructor this is the department, section if student

    courses: [{ type: String }], //if student this is the courses taken

    studentNumber: { type: String },//assignable?
    course: { type: String }, //porgram of the student ex. Information technology
    year: { type: String }, //year of study
    section: { type: String }, //section of the program

    isRegular: { type: Boolean },
    isArchived: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);