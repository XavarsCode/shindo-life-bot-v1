// models/ScheduledEvent.js
const mongoose = require('mongoose');

const scheduledEventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: null
    },
    scheduled_for: { // Date et heure de l'événement
        type: Date,
        required: true
    },
    announced_message_id: { // L'ID du message d'annonce dans le salon
        type: String,
        default: null
    },
    status: { // 'scheduled', 'active', 'completed', 'cancelled'
        type: String,
        enum: ['scheduled', 'active', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    created_by_id: {
        type: String,
        required: true
    },
    created_by_tag: {
        type: String,
        required: true
    }
}, { timestamps: true });

// Méthodes statiques
scheduledEventSchema.statics.createEvent = async function(name, description, scheduledFor, createdById, createdByTag) {
    return this.create({
        name,
        description,
        scheduled_for: scheduledFor,
        created_by_id: createdById,
        created_by_tag: createdByTag
    });
};

scheduledEventSchema.statics.getUpcomingEvents = async function() {
    return this.find({ scheduled_for: { $gt: new Date() }, status: 'scheduled' }).sort({ scheduled_for: 1 });
};

scheduledEventSchema.statics.markAsActive = async function(eventId) {
    return this.findByIdAndUpdate(eventId, { status: 'active' });
};

scheduledEventSchema.statics.markAsCompleted = async function(eventId) {
    return this.findByIdAndUpdate(eventId, { status: 'completed' });
};

scheduledEventSchema.statics.markAsCancelled = async function(eventId) {
    return this.findByIdAndUpdate(eventId, { status: 'cancelled' });
};

scheduledEventSchema.statics.updateAnnouncedMessageId = async function(eventId, messageId) {
    return this.findByIdAndUpdate(eventId, { announced_message_id: messageId });
};

const ScheduledEvent = mongoose.model('ScheduledEvent', scheduledEventSchema);

module.exports = ScheduledEvent;