const mongoose = require('mongoose');

const studentSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    middleName: { type: String },

    studentNumber: { type: String },//assignable?
    course: { type: String }, //porgram
    year: { type: String }, //year of study
    section: { type: String }, //section of the program

    isRegular: { type: Boolean, required: true }, //if the student is regular or not

    semester: { type: String }, //semester of the program
    status: { type: String }, //status of the student (e.g. enrolled, waitlisted, dropped)


});

module.exports = mongoose.model('Student', studentSchema);