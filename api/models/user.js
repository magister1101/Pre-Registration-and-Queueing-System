const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },

    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    middleName: { type: String },

    file: { type: String },
    role: { type: String, required: true, default: "student" }, //student, instructor, admin
    courses: [{ type: String }],
    isArchived: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);