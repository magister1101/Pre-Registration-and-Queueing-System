const mongoose = require('mongoose');

const scheduleSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    code: { type: String, required: true },
    course: { type: String, required: true, ref: 'Course' },
    section: { type: String, required: true },
    schedule: [{
        day: { type: String, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
    }],

    isArchived: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Schedule', scheduleSchema);