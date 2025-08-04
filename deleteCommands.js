const { REST, Routes } = require('discord.js');
const process = require('node:process');

// Ces variables seront lues directement depuis les Secrets de Replit
// Assurez-vous d'avoir ajouté DISCORD_TOKEN et CLIENT_ID dans l'onglet "Secrets" de votre Replit
const DISCORD_TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; // C'est votre "Application ID" depuis le portail développeur Discord

// !!! OPTIONNEL : SI VOS COMMANDES FANTÔMES SONT SPÉCIFIQUES À UNE GUILDE !!!
// Laissez cette ligne commentée ou vide si vous voulez supprimer les commandes GLOBALEMENT.
// Sinon, remplacez par l'ID de la guilde où les commandes fantômes se trouvent.
// const GUILD_ID = process.env.GUILD_ID; // Vous pouvez aussi mettre l'ID d'une guilde dans les secrets Replit
const GUILD_ID = ''; // Laissez vide ou commentez si vous voulez supprimer les commandes globales

if (!DISCORD_TOKEN) {
    console.error("ERREUR : Le secret 'DISCORD_TOKEN' n'est pas configuré dans l'onglet 'Secrets' de Replit.");
    process.exit(1);
}

if (!CLIENT_ID) {
    console.error("ERREUR : Le secret 'CLIENT_ID' n'est pas configuré dans l'onglet 'Secrets' de Replit. C'est l'ID de votre application bot.");
    process.exit(1);
}

const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log('Début de la suppression des commandes de slash...');

        let commandsRoute;
        let contextMessage;

        if (GUILD_ID) {
            commandsRoute = Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID);
            contextMessage = `pour la guilde ${GUILD_ID}`;
        } else {
            commandsRoute = Routes.applicationCommands(CLIENT_ID);
            contextMessage = 'globales (cela peut prendre jusqu\'à 1 heure pour se propager)';
        }

        console.log(`Suppression des commandes de slash ${contextMessage}...`);
        await rest.put(
            commandsRoute,
            { body: [] }, // Envoie un tableau vide pour supprimer toutes les commandes
        );
        console.log(`Toutes les commandes de slash ${contextMessage} ont été supprimées avec succès !`);

    } catch (error) {
        // Gérer l'erreur
        console.error('Erreur lors de la suppression des commandes de slash :', error);
    } finally {
        // Quitte le processus après l'exécution
        process.exit(0);
    }
})();