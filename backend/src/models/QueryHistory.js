const mongoose = require('mongoose');

const queryHistorySchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    query: {
        type: String,
        required: true
    },
    response: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    metadata: {
        type: Map,
        of: String
    }
});

module.exports = mongoose.model('QueryHistory', queryHistorySchema);

