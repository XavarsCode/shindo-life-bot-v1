// deploy.js (Version avec logs de débogage améliorés)
const { REST, Routes } = require('discord.js');

async function deployCommands(token, clientId, guildId, commandsCollection) {
    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log('🔄 Début du déploiement des commandes slash...');

        // Convertit la Collection de commandes en un tableau d'objets JSON
        // Chaque commande dans la collection est un objet { data, execute },
        // nous voulons seulement la partie 'data' pour le déploiement.
        const commandsToDeploy = [...commandsCollection.values()].map(command => {
            if (command.data) {
                return command.data.toJSON();
            } else {
                console.warn(`[AVERTISSEMENT DÉPLOIEMENT] Une commande (${command.name || 'nom inconnu'}) n'a pas de propriété 'data' valide. Elle sera ignorée.`);
                return null; // Retourne null pour les commandes invalides
            }
        }).filter(Boolean); // Filtre les nulls pour ne garder que les commandes valides

        console.log(`📦 Préparation de ${commandsToDeploy.length} commandes pour le déploiement.`);
        // console.log('Liste des commandes à déployer (JSON):', JSON.stringify(commandsToDeploy, null, 2)); // Décommenter si vous voulez voir le JSON complet

        // Si un GUILD_ID est fourni, nous nous concentrons sur les commandes de guilde.
        if (guildId) {
            console.log(`🚀 Tentative de déploiement des commandes sur la guilde ${guildId}...`);
            await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commandsToDeploy },
            );
            console.log(`✅ Commande(s) déployée(s) sur la guilde ${guildId} avec succès !`);

        } else {
            console.warn('⚠️ Aucun ID de guilde fourni. Déploiement en mode GLOBAL (propagation jusqu\'à 1h).');
            console.log('🚀 Tentative de déploiement des commandes GLOBALEMENT...');
            await rest.put(
                Routes.applicationCommands(clientId),
                { body: commandsToDeploy },
            );
            console.log('✅ Commande(s) globale(s) déployée(s) avec succès !');
        }

    } catch (error) {
        console.error('❌ Erreur CRITIQUE lors du déploiement des commandes:', error);
        console.error('Détails de l\'erreur:', error.code || 'N/A', error.message);
        if (error.rawError) {
            console.error('Erreur brute de l\'API Discord:', JSON.stringify(error.rawError, null, 2));
        }
        console.error('Assurez-vous que votre CLIENT_ID, GUILD_ID et TOKEN sont corrects et que le bot a la permission "applications.commands".');
    }
}

module.exports = { deployCommands };