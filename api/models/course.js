const mongoose = require('mongoose');

const courseSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: { type: String, required: true },//course title
    code: { type: String, required: true }, //course code
    unit: { type: Number, required: true }, //no. of units
    course: { type: String, required: true }, //course of the subject
    description: { type: String, required: true },
    prerequisite: [{ type: String }],
    file: { type: String },
    isArchived: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Course', courseSchema);