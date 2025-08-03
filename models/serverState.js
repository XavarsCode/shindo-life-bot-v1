// models/ServerStatus.js
const mongoose = require('mongoose');

const serverStatusSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['online', 'offline', 'maintenance'],
        default: 'offline',
        required: true
    },
    server_code: { // Nouveau : stocke le code du serveur privé
        type: String,
        default: null
    },
    event_active: { // Nouveau : indique si un événement est en cours
        type: Boolean,
        default: false
    },
    event_name: { // Nouveau : nom de l'événement en cours
        type: String,
        default: null
    },
    maintenance_mode: { // Existant, mais assurez-vous qu'il est là
        type: Boolean,
        default: false
    },
    message_id: { // ID du message de statut dans le salon d'annonce
        type: String,
        default: null
    },
    stats: { // Nouveau : Regroupe les statistiques du serveur
        total_sessions: { type: Number, default: 0 },
        total_playtime: { type: Number, default: 0 }, // En minutes, heures, ou autre selon votre besoin
        last_opened: { type: Date, default: null }
    }
}, { timestamps: true }); // Ajoute createdAt et updatedAt

// Méthodes statiques pour une interaction facile avec le modèle
serverStatusSchema.statics.getStatus = async function() {
    let status = await this.findOne();
    if (!status) {
        status = await this.create({}); // Crée une entrée par défaut si elle n'existe pas
    }
    return status;
};

serverStatusSchema.statics.updateStatus = async function(newStatus, serverCode = null) {
    const doc = await this.getStatus();
    doc.status = newStatus;
    if (serverCode !== null) {
        doc.server_code = serverCode;
    }
    // Si on passe en online, mettre à jour les stats de session et lastOpened
    if (newStatus === 'online') {
        doc.stats.total_sessions = (doc.stats.total_sessions || 0) + 1;
        doc.stats.last_opened = new Date();
        doc.event_active = false; // Assurez-vous qu'aucun événement n'est actif si le serveur est juste "ouvert"
        doc.event_name = null;
    }
    // Si on ferme le serveur, réinitialiser le code
    if (newStatus === 'offline') {
        doc.server_code = null;
        doc.event_active = false;
        doc.event_name = null;
    }
    // Si maintenance, mettre le code à null aussi
    if (newStatus === 'maintenance') {
        doc.server_code = null;
        doc.maintenance_mode = true;
        doc.event_active = false;
        doc.event_name = null;
    } else {
        doc.maintenance_mode = false; // La désactiver si on n'est pas en maintenance
    }

    await doc.save();
    return doc;
};

serverStatusSchema.statics.updateMaintenanceMode = async function(isMaintenance) {
    const doc = await this.getStatus();
    doc.maintenance_mode = isMaintenance;
    if (isMaintenance) {
        doc.status = 'maintenance';
        doc.server_code = null; // Pas de code si en maintenance
        doc.event_active = false;
        doc.event_name = null;
    } else {
        doc.status = 'offline'; // Revenir à "fermé" ou "ouvert" par défaut après maintenance
        // Vous pouvez ajouter une logique pour revenir à 'online' si c'était le cas avant
    }
    await doc.save();
    return doc;
};


serverStatusSchema.statics.updateMessageId = async function(messageId) {
    const doc = await this.getStatus();
    doc.message_id = messageId;
    await doc.save();
    return doc;
};

serverStatusSchema.statics.updateEventStatus = async function(isActive, eventName = null) {
    const doc = await this.getStatus();
    doc.event_active = isActive;
    doc.event_name = eventName;
    await doc.save();
    return doc;
};

// Méthode pour incrémenter le temps de jeu (à appeler régulièrement si vous suivez ça)
serverStatusSchema.statics.incrementPlaytime = async function(minutes) {
    const doc = await this.getStatus();
    doc.stats.total_playtime = (doc.stats.total_playtime || 0) + minutes;
    await doc.save();
    return doc;
};


const ServerStatus = mongoose.model('ServerStatus', serverStatusSchema);

module.exports = ServerStatus;