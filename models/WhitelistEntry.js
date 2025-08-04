// models/WhitelistEntry.js
const mongoose = require('mongoose');

const whitelistEntrySchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        unique: true // Un utilisateur ne peut être qu'une fois dans la whitelist
    },
    user_tag: {
        type: String,
        required: true
    },
    added_by: { // Qui a ajouté l'utilisateur
        type: String,
        default: null
    },
    added_at: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Méthodes statiques
whitelistEntrySchema.statics.addEntry = async function(userId, userTag, addedBy = null) {
    return this.create({ user_id: userId, user_tag: userTag, added_by: addedBy });
};

whitelistEntrySchema.statics.removeEntry = async function(userId) {
    return this.deleteOne({ user_id: userId });
};

whitelistEntrySchema.statics.isWhitelisted = async function(userId) {
    const entry = await this.findOne({ user_id: userId });
    return !!entry; // Retourne true si trouvé, false sinon
};

whitelistEntrySchema.statics.getAllEntries = async function() {
    return this.find().sort({ user_tag: 1 });
};

const WhitelistEntry = mongoose.model('WhitelistEntry', whitelistEntrySchema);

module.exports = WhitelistEntry;