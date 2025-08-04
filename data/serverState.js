// data/serverState.js
const ServerStatusModel = require('../models/ServerStatus'); // Importe le modèle Mongoose

const serverStatus = {
    // Méthode pour obtenir le statut actuel du serveur
    async getStatus() {
        let status = await ServerStatusModel.findOne();
        if (!status) {
            status = await ServerStatusModel.create({}); // Crée une entrée par défaut si elle n'existe pas
        }
        return status;
    },

    // Méthode pour mettre à jour le statut principal du serveur
    async updateStatus(newStatus, serverCode = null) {
        const doc = await this.getStatus();
        doc.status = newStatus;
        if (serverCode !== null) {
            doc.server_code = serverCode;
        }
        if (newStatus === 'online') {
            doc.stats.total_sessions = (doc.stats.total_sessions || 0) + 1;
            doc.stats.last_opened = new Date();
            doc.event_active = false;
            doc.event_name = null;
        }
        if (newStatus === 'offline') {
            doc.server_code = null;
            doc.event_active = false;
            doc.event_name = null;
        }
        if (newStatus === 'maintenance') {
            doc.server_code = null;
            doc.maintenance_mode = true;
            doc.event_active = false;
            doc.event_name = null;
        } else {
            doc.maintenance_mode = false;
        }
        await doc.save();
        return doc;
    },

    // Méthode pour activer/désactiver le mode maintenance
    async updateMaintenanceMode(isMaintenance) {
        const doc = await this.getStatus();
        doc.maintenance_mode = isMaintenance;
        if (isMaintenance) {
            doc.status = 'maintenance';
            doc.server_code = null;
            doc.event_active = false;
            doc.event_name = null;
        } else {
            doc.status = 'offline'; // Revenir à "fermé" par défaut après maintenance
        }
        await doc.save();
        return doc;
    },

    // Méthode pour mettre à jour l'ID du message de statut Discord
    async updateMessageId(messageId) {
        const doc = await this.getStatus();
        doc.message_id = messageId;
        await doc.save();
        return doc;
    },

    // Méthode pour gérer le statut d'un événement
    async updateEventStatus(isActive, eventName = null) {
        const doc = await this.getStatus();
        doc.event_active = isActive;
        doc.event_name = eventName;
        await doc.save();
        return doc;
    },

    // Méthode pour incrémenter le temps de jeu
    async incrementPlaytime(minutes) {
        const doc = await this.getStatus();
        doc.stats.total_playtime = (doc.stats.total_playtime || 0) + minutes;
        await doc.save();
        return doc;
    }
};

module.exports = { serverStatus }; // Exporte l'objet serverStatus