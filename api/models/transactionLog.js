const mongoose = require('mongoose');

const transactionLogSchema = mongoose.Schema({
    userId: { type: String, required: true, ref: 'User' },
    clockIn: { type: Date },
    clockOut: { type: Date }, // Fixed: capital "O"
}, { timestamps: true });

module.exports = mongoose.model('TransactionLog', transactionLogSchema);
