// index.js
const fs = require('fs'); // Nécessaire pour lire le fichier deploy.js

try {
    const deployJsContent = fs.readFileSync('./deploy.js', 'utf8');
    console.log('\n--- CONTENU DU FICHIER deploy.js QUE LE BOT EXÉCUTE ACTUELLEMENT ---\n');
    console.log(deployJsContent);
    console.log('\n--- FIN DU CONTENU DE deploy.js ---\n');
} catch (err) {
    console.error('Erreur lors de la lecture de deploy.js au démarrage (peut signifier que le fichier n\'existe pas ou problème de permissions):', err.message);
}


const { Client, GatewayIntentBits, ActivityType, Collection } = require('discord.js');
const { deployCommands } = require('./deploy');
const { handleInteraction } = require('./handlers/interactionHandler');
const { keepAlive } = require('./utils/keepAlive'); // Si vous l'utilisez
const path = require('node:path');
// Note : Le module 'fs' est déjà inclus en haut.

// Configuration du bot - Les IDs sont chargés depuis les secrets Replit
const config = {
    token: process.env['TOKEN'],
    clientId: process.env['CLIENT_ID'],
    guildId: process.env['GUILD_ID'],
    channelId: process.env['CHANNEL_ID'], // Salon général ou d'annonces
    roleId: process.env['ROLE_ID'], // Rôle pour les permissions staff
    rpValidationChannelId: process.env['RP_VALIDATION_CHANNEL_ID'], // Salon où les suivis RP sont envoyés pour validation
    rpApprovedChannelId: process.env['RP_APPROVED_CHANNEL_ID'], // Salon où les suivis RP validés sont archivés
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

client.commands = new Collection(); // Initialisation de la collection de commandes

// --- LOGIQUE DE CHARGEMENT DES COMMANDES ---
const foldersPath = path.join(__dirname, 'commands'); // Le dossier principal 'commands'
const commandFolders = fs.readdirSync(foldersPath).filter(folder => fs.statSync(path.join(foldersPath, folder)).isDirectory());

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`[CHARGEUR] Commande "${command.data.name}" chargée depuis ${folder}/${file}.`);
        } else {
            console.warn(`[AVERTISSEMENT] La commande dans ${filePath} est mal formée (manque 'data' ou 'execute').`);
        }
    }
}
// --- FIN DE LA LOGIQUE DE CHARGEMENT DES COMMANDES ---

client.once('ready', async () => {
    console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
    client.user.setActivity('Shindo Life RP', { type: ActivityType.Watching });

    // On passe maintenant client.commands à deployCommands
    await deployCommands(config.token, config.clientId, config.guildId, client.commands);

    // keepAlive(); // Décommenter si vous utilisez une fonction keepAlive
});

client.on('interactionCreate', async interaction => {
    await handleInteraction(interaction, client, config);
});

client.login(config.token);