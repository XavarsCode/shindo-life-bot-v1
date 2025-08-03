// models/TempBanEntry.js
const mongoose = require('mongoose');

const tempBanEntrySchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        unique: true // Un utilisateur ne peut avoir qu'un seul bannissement temporaire actif
    },
    user_tag: {
        type: String,
        required: true
    },
    banned_by_id: {
        type: String,
        required: true
    },
    banned_by_tag: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        default: 'Aucune raison fournie.'
    },
    ban_until: { // Date et heure de fin du bannissement
        type: Date,
        required: true
    },
    // ID du message de log si vous en avez un pour les tempbans
    log_message_id: {
        type: String,
        default: null
    }
}, { timestamps: true });

// Index pour optimiser la recherche par date de fin et userId
tempBanEntrySchema.index({ ban_until: 1 });
tempBanEntrySchema.index({ user_id: 1 });

// Méthodes statiques
tempBanEntrySchema.statics.addBan = async function(userId, userTag, bannedById, bannedByTag, reason, banUntil) {
    return this.create({
        user_id: userId,
        user_tag: userTag,
        banned_by_id: bannedById,
        banned_by_tag: bannedByTag,
        reason: reason,
        ban_until: banUntil
    });
};

tempBanEntrySchema.statics.removeBan = async function(userId) {
    return this.deleteOne({ user_id: userId });
};

tempBanEntrySchema.statics.getActiveBan = async function(userId) {
    return this.findOne({ user_id: userId, ban_until: { $gt: new Date() } }); // Cherche un ban actif
};

tempBanEntrySchema.statics.getExpiredBans = async function() {
    return this.find({ ban_until: { $lte: new Date() } }); // Cherche les bans expirés
};

const TempBanEntry = mongoose.model('TempBanEntry', tempBanEntrySchema);

module.exports = TempBanEntry;