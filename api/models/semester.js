const mongoose = require('mongoose');

const semesterSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    semester: { type: String, required: true, default: 'first' },
});

module.exports = mongoose.model('Semester', semesterSchema);