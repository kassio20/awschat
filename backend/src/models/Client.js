const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    awsAccountId: {
        type: String,
        required: true,
        unique: true
    },
    awsAccessKeyId: {
        type: String,
        required: true
    },
    awsSecretAccessKey: {
        type: String,
        required: true
    },
    awsRegion: {
        type: String,
        default: 'us-east-1'
    },
    active: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Client', clientSchema);

