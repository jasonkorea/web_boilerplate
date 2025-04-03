const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    user: String,
    text: String,
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room'
    },
    type: {
        type: String,
        enum: ['chat', 'system'],
        default: 'chat'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);
