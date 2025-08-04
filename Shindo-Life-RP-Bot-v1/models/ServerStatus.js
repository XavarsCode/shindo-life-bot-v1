// models/ServerStatus.js
const mongoose = require('mongoose');

const serverStatusSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['online', 'offline', 'maintenance'],
        default: 'offline',
        required: true
    },
    server_code: {
        type: String,
        default: null
    },
    event_active: {
        type: Boolean,
        default: false
    },
    event_name: {
        type: String,
        default: null
    },
    maintenance_mode: {
        type: Boolean,
        default: false
    },
    message_id: {
        type: String,
        default: null
    },
    stats: {
        total_sessions: { type: Number, default: 0 },
        total_playtime: { type: Number, default: 0 },
        last_opened: { type: Date, default: null }
    }
}, { timestamps: true });

const ServerStatus = mongoose.model('ServerStatus', serverStatusSchema);

module.exports = ServerStatus;