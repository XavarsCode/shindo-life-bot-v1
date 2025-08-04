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
    },
    duration: { // Durée en minutes
        type: Number,
        default: null
    },
    type: { // 'rp' ou 'mini_jeu'
        type: String,
        enum: ['rp', 'mini_jeu', null],
        default: null
    },
    voice_channel_id: { // ID du salon vocal personnalisé
        type: String,
        default: null
    },
    participants: [ // Tableau des participants
        {
            user_id: { type: String, required: true },
            user_tag: { type: String, required: true },
            joined_at: { type: Date, default: Date.now }
        }
    ],
    reminder_sent: { // Nouveau champ: pour le rappel avant l'événement
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Ajoutez un index pour optimiser la recherche par message_id
scheduledEventSchema.index({ announced_message_id: 1 });

// Méthodes statiques pour le modèle ScheduledEvent
scheduledEventSchema.statics.createEvent = async function(name, description, scheduledFor, createdById, createdByTag, duration = null, type = null, voiceChannelId = null) {
    return this.create({
        name,
        description,
        scheduled_for: scheduledFor,
        created_by_id: createdById,
        created_by_tag: createdByTag,
        duration,
        type,
        voice_channel_id: voiceChannelId,
        reminder_sent: false // S'assure que ce champ est initialisé à false
    });
};

scheduledEventSchema.statics.getUpcomingEvents = async function() {
    return this.find({ scheduled_for: { $gt: new Date() }, status: 'scheduled' }).sort({ scheduled_for: 1 });
};

scheduledEventSchema.statics.getEditableEvents = async function() {
    return this.find({ status: { $in: ['scheduled', 'active'] } }).sort({ scheduled_for: 1 });
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

scheduledEventSchema.statics.findByAnnouncedMessageId = async function(messageId) {
    return this.findOne({ announced_message_id: messageId });
};

scheduledEventSchema.statics.addParticipant = async function(eventId, userId, userTag) {
    // Utilisez $addToSet pour éviter les doublons de participants
    return this.findByIdAndUpdate(
        eventId,
        { $addToSet: { participants: { user_id: userId, user_tag: userTag } } },
        { new: true } // Retourne le document mis à jour
    );
};

scheduledEventSchema.statics.removeParticipant = async function(eventId, userId) {
    return this.findByIdAndUpdate(
        eventId,
        { $pull: { participants: { user_id: userId } } },
        { new: true }
    );
};

scheduledEventSchema.statics.updateEventFields = async function(eventId, updates) {
    return this.findByIdAndUpdate(eventId, { $set: updates }, { new: true, runValidators: true });
};

// Nouvelle méthode statique pour supprimer un événement
scheduledEventSchema.statics.deleteEvent = async function(eventId) {
    return this.findByIdAndDelete(eventId);
};

// Nouvelle méthode statique pour marquer le rappel comme envoyé
scheduledEventSchema.statics.markReminderSent = async function(eventId) {
    return this.findByIdAndUpdate(eventId, { reminder_sent: true });
};


const ScheduledEvent = mongoose.model('ScheduledEvent', scheduledEventSchema);

ScheduledEvent.participationRequests = new Map(); // userId -> eventId

ScheduledEvent.addParticipationRequest = (userId, eventId) => {
    ScheduledEvent.participationRequests.set(userId, eventId);
};

ScheduledEvent.getParticipationRequest = (userId) => {
    return ScheduledEvent.participationRequests.get(userId);
};

ScheduledEvent.removeParticipationRequest = (userId) => {
    ScheduledEvent.participationRequests.delete(userId);
};

module.exports = ScheduledEvent;