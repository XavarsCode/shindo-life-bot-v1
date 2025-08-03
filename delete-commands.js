const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// --- Configuration du bot ---
// Assurez-vous que ces informations sont correctes et sécurisées.
// Il est recommandé d'utiliser des variables d'environnement pour le token.
const config = {
    clientId: '1391370636424646736',    // ID de votre application bot
    guildId: '1390697325013372990',      // ID du serveur de développement (pour les commandes de guilde)
    token: 'const mySecret = process.env['TOKEN']',       // Token de votre bot
};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Collection pour stocker vos commandes
client.commands = new Collection();

// --- Chargement des commandes depuis le dossier "commands" ---
const foldersPath = path.join(__dirname, 'commands'); // Assurez-vous que vos commandes sont dans un dossier 'commands'
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.warn(`[AVERTISSEMENT] La commande ${filePath} manque une propriété "data" ou "execute" requise.`);
        }
    }
}

// --- Logique de déploiement des commandes ---
client.once('ready', async () => {
    console.log(`Bot prêt ! Connecté en tant que ${client.user.tag}`);

    const rest = new REST().setToken(config.token);

    try {
        // --- Étape 1 : Suppression de toutes les commandes existantes ---
        console.log('Début de la suppression de toutes les commandes existantes...');

        // Supprimer les commandes de guilde (très rapide)
        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: [] },
        );
        console.log(`Toutes les commandes de guilde (${config.guildId}) ont été supprimées avec succès.`);

        // Supprimer les commandes globales (peut prendre jusqu'à une heure pour se propager)
        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: [] },
        );
        console.log('Toutes les commandes globales ont été supprimées avec succès.');

        // --- Étape 2 : Enregistrement des nouvelles commandes ---
        console.log(`Début du rafraîchissement des ${client.commands.size} commandes d'application (slash commands).`);

        const commandsToDeploy = client.commands.map(command => command.data.toJSON());

        // Déployer les commandes de guilde (plus rapide pour le développement)
        const guildData = await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commandsToDeploy },
        );
        console.log(`Rechargement réussi de ${guildData.length} commandes de guilde sur ${config.guildId}.`);

        // Pour déployer les commandes globales (décommenter si vous voulez qu'elles soient globales)
        // Note: Les commandes globales peuvent prendre jusqu'à une heure pour apparaître.
        /*
        const globalData = await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commandsToDeploy },
        );
        console.log(`Rechargement réussi de ${globalData.length} commandes globales.`);
        */

    } catch (error) {
        console.error('Erreur lors du déploiement des commandes :', error);
    }
});

// --- Gestion des interactions de commande ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`Aucune commande correspondant à ${interaction.commandName} n'a été trouvée.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Erreur lors de l'exécution de la commande ${interaction.commandName}:`, error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'Une erreur est survenue lors de l\'exécution de cette commande !', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Une erreur est survenue lors de l\'exécution de cette commande !', ephemeral: true });
        }
    }
});

// Connexion du bot
client.login(config.token);