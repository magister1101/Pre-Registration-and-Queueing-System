const mongoose = require('mongoose');

const schedCounterSchema = new mongoose.Schema({
    value: Number
});

module.exports = mongoose.model('SchedCounter', schedCounterSchema);
