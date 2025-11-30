const mongoose = require('mongoose');

const testModelSchema = new mongoose.Schema({
    studentNumber: { type: String, required: true },
    courseCode: { type: String, required: true },
    grade: { type: Number, required: true },
    sem: { type: String, required: true },
    year: { type: String, required: true }
});

module.exports = mongoose.model('TestModel', testModelSchema);
