const mongoose = require('mongoose');

const queueSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    queueNumber: { type: String, required: true },

    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseToTake: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true }],

    status: { type: String, required: true, default: 'Waiting' },

    destination: { type: String, required: true }, // registrar → osas → cashier
    isArchived: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Queue', queueSchema);