// models/RpEntry.js
const Database = require('better-sqlite3');
const path = require('path');

// Chemin vers le fichier de base de données SQLite
// Le dossier 'data' doit être créé à la racine de votre bot (là où se trouve index.js)
const dbPath = path.resolve(__dirname, '../data/rp_followups.sqlite');
const db = new Database(dbPath);

// Créer la table si elle n'existe pas
db.exec(`
    CREATE TABLE IF NOT EXISTS rp_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_tag TEXT NOT NULL,
        entry_title TEXT NOT NULL,
        entry_description TEXT NOT NULL,
        original_message_url TEXT,
        image_link TEXT, -- Facultatif : Pour les liens d'images explicites
        validation_message_id TEXT, -- Pour suivre le message du bot avec les boutons
        status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
        validated_by_id TEXT,
        validated_by_tag TEXT,
        validation_date INTEGER -- Horodatage Unix (en millisecondes)
    );
`);

console.log('Base de données pour les entrées RP initialisée ou connectée.');

const RpEntry = {
    /**
     * Ajoute une nouvelle entrée RP à la base de données avec le statut 'pending'.
     * @param {string} userId - L'ID de l'utilisateur qui a soumis l'entrée.
     * @param {string} userTag - Le tag de l'utilisateur (ex: Utilisateur#1234).
     * @param {string} entryTitle - Le titre/catégorie de l'entrée.
     * @param {string} entryDescription - La description de l'entrée.
     * @param {string} originalMessageUrl - L'URL du message Discord original.
     * @param {string|null} imageLink - Facultatif : Un lien vers une image.
     * @param {string} validationMessageId - L'ID du message du bot avec les boutons de validation.
     * @returns {object} Les données de l'entrée insérée.
     */
    add: function(userId, userTag, entryTitle, entryDescription, originalMessageUrl, imageLink, validationMessageId) {
        const stmt = db.prepare(`
            INSERT INTO rp_entries (user_id, user_tag, entry_title, entry_description, original_message_url, image_link, validation_message_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(userId, userTag, entryTitle, entryDescription, originalMessageUrl, imageLink, validationMessageId, 'pending');
        return { id: info.lastInsertRowid, userId, userTag, entryTitle, entryDescription, originalMessageUrl, imageLink, validationMessageId, status: 'pending' };
    },

    /**
     * Met à jour le statut d'une entrée RP.
     * @param {number} entryId - L'ID de l'entrée à mettre à jour.
     * @param {string} status - Le nouveau statut ('approved' ou 'rejected').
     * @param {string} validatedById - L'ID du membre du staff qui a validé.
     * @param {string} validatedByTag - Le tag du membre du staff.
     * @returns {boolean} True si la mise à jour a réussi, false sinon.
     */
    updateStatus: function(entryId, status, validatedById, validatedByTag) {
        const stmt = db.prepare(`
            UPDATE rp_entries
            SET status = ?, validated_by_id = ?, validated_by_tag = ?, validation_date = ?
            WHERE id = ?
        `);
        const info = stmt.run(status, validatedById, validatedByTag, Date.now(), entryId);
        return info.changes > 0;
    },

    /**
     * Trouve une entrée RP par l'ID de son message de validation.
     * @param {string} validationMessageId - L'ID du message du bot avec les boutons de validation.
     * @returns {object|undefined} Les données de l'entrée ou undefined si non trouvée.
     */
    findByValidationMessageId: function(validationMessageId) {
        const stmt = db.prepare('SELECT * FROM rp_entries WHERE validation_message_id = ?');
        return stmt.get(validationMessageId);
    },

    /**
     * Obtient toutes les entrées RP approuvées pour un utilisateur spécifique.
     * @param {string} userId - L'ID de l'utilisateur.
     * @returns {Array<object>} Une liste d'entrées approuvées.
     */
    getApprovedEntriesByUser: function(userId) {
        const stmt = db.prepare('SELECT * FROM rp_entries WHERE user_id = ? AND status = ? ORDER BY validation_date DESC');
        return stmt.all(userId, 'approved');
    }
};

module.exports = RpEntry;