// models/QueueEntry.js
const mongoose = require('mongoose');

const QueueEntrySchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        unique: true // Un utilisateur ne peut être qu'une seule fois dans la file d'attente
    },
    username: {
        type: String,
        required: true
    },
    joined_at: {
        type: Date,
        default: Date.now
    }
});

// Méthodes statiques pour faciliter la gestion de la file d'attente
QueueEntrySchema.statics.addEntry = async function(userId, username) {
    try {
        const newEntry = new this({ user_id: userId, username: username });
        await newEntry.save();
        return newEntry;
    } catch (error) {
        if (error.code === 11000) { // Erreur de duplicata (user_id unique)
            throw new Error('Cet utilisateur est déjà dans la file d\'attente.');
        }
        throw error;
    }
};

QueueEntrySchema.statics.removeEntry = async function(userId) {
    return this.deleteOne({ user_id: userId });
};

QueueEntrySchema.statics.getQueue = async function() {
    return this.find().sort({ joined_at: 1 }); // Trié par ordre d'arrivée
};

QueueEntrySchema.statics.clearQueue = async function() {
    return this.deleteMany({});
};

const QueueEntry = mongoose.model('QueueEntry', QueueEntrySchema);

module.exports = QueueEntry;