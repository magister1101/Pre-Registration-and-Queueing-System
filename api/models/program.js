const mongoose = require('mongoose');
const { type } = require('os');

const programSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: { type: String, required: true },//program title
    code: { type: String, required: true },//program code
    file: { type: String },
    isArchived: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Program', programSchema);