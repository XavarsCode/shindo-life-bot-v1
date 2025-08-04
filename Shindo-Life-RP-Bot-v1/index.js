// index.js
const { Client, GatewayIntentBits, ActivityType, Collection, Partials, EmbedBuilder, Colors } = require('discord.js');
const { deployCommands } = require('./deploy'); // Assurez-vous que deployCommands est à jour
const { handleInteraction } = require('./handlers/interactionHandler');
const { keepAlive } = require('./utils/keepAlive'); // Si vous l'utilisez
const path = require('node:path');
const fs = require('fs');
const mongoose = require('mongoose'); // Import de Mongoose
const moment = require('moment'); // Importez moment

const ScheduledEvent = require('./models/ScheduledEvent'); // Import du modèle ScheduledEvent

// Configuration du bot - Les IDs sont chargés depuis les secrets Replit
const config = {
    token: process.env['TOKEN'],
    clientId: process.env['CLIENT_ID'],
    guildId: process.env['GUILD_ID'],
    channelId: process.env['CHANNEL_ID'], // Salon général ou d'annonces
    roleId: process.env['ROLE_ID'], // Rôle pour les permissions staff
    rpValidationChannelId: process.env['RP_VALIDATION_CHANNEL_ID'], // Salon où les suivis RP sont envoyés pour validation
    rpApprovedChannelId: process.env['RP_APPROVED_CHANNEL_ID'], // Salon où les suivis RP validés sont archivés

    // Configuration pour les événements et MongoDB
    EVENT_ANNOUNCE_CHANNEL_ID: process.env['EVENT_ANNOUNCE_CHANNEL_ID'],
    PARTICIPATION_EMOJI: process.env['PARTICIPATION_EMOJI'],
    MONGODB_URI: process.env['MONGODB_URI'], // Utilisation de MONGODB_URI comme dans votre ancien index

    // Nouvelles configurations pour les rappels d'événements
    REMINDER_TIME_MINUTES: 15, // Temps avant l'événement pour envoyer le rappel (en minutes)
    REMINDER_CHECK_INTERVAL_MINUTES: 5 // Intervalle de vérification des rappels (en minutes)
};

// Connexion à MongoDB
if (!config.MONGODB_URI) {
    console.error("ERREUR: MONGODB_URI n'est pas configuré dans les secrets Replit. Le bot ne peut pas démarrer sans une base de données.");
    process.exit(1); // Arrête le bot si la connexion à la BDD n'est pas possible
}

mongoose.connect(config.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000, // Augmenté pour gérer les réveils de cluster gratuits
})
.then(() => console.log('✅ Connecté à MongoDB !'))
.catch(err => {
    console.error('❌ Erreur de connexion à MongoDB :', err);
    process.exit(1); // Arrête le bot si la connexion à la BDD échoue
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions, // Nécessaire pour les réactions
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User], // Nécessaire pour les réactions et DMs partiels
});

client.commands = new Collection(); // Initialisation de la collection de commandes

// --- LOGIQUE DE CHARGEMENT DES COMMANDES ---
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath).filter(folder => fs.statSync(path.join(foldersPath, folder)).isDirectory());

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.warn(`[AVERTISSEMENT] La commande dans ${filePath} est mal formée (manque 'data' ou 'execute').`);
        }
    }
}
// --- FIN DE LA LOGIQUE DE CHARGEMENT DES COMMANDES ---

// --- Chargement des gestionnaires d'événements (votre structure existante) ---
const eventsPath = path.join(__dirname, 'events'); // Assurez-vous que c'est le bon chemin pour votre dossier 'events'
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        // IMPORTANT: Passez 'client' et 'config' en derniers arguments pour qu'ils soient disponibles dans l'événement
        client.once(event.name, (...args) => event.execute(...args, client, config));
    } else {
        // IMPORTANT: Passez 'client' et 'config' en derniers arguments
        client.on(event.name, (...args) => event.execute(...args, client, config));
    }
}
// --- FIN DE LA LOGIQUE DE CHARGEMENT DES ÉVÉNEMENTS ---

// Fonction pour vérifier et envoyer les rappels d'événements
async function checkAndSendReminders(client, config) {
    console.log('[Scheduler] Vérification des événements pour les rappels...');
    const now = moment();
    const reminderThreshold = moment().add(config.REMINDER_TIME_MINUTES, 'minutes');

    try {
        const eventsToRemind = await ScheduledEvent.find({
            status: 'scheduled',
            reminder_sent: false,
            // L'événement doit être programmé pour commencer entre maintenant et le seuil de rappel
            scheduled_for: { $lte: reminderThreshold.toDate(), $gt: now.toDate() }
        });

        for (const event of eventsToRemind) {
            console.log(`[Scheduler] Rappel pour l'événement: ${event.name} (${event.participants.length} participants)`);

            const reminderEmbed = new EmbedBuilder()
                .setColor(Colors.Orange)
                .setTitle(`🔔 Rappel d'événement : ${event.name}`)
                .setDescription(`L'événement **${event.name}** commencera ${moment(event.scheduled_for).fromNow()} !`)
                .addFields(
                    { name: "Heure de début", value: `<t:${Math.floor(event.scheduled_for.getTime() / 1000)}:F>`, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Préparez-vous !' });

            if (event.voice_channel_id && config.guildId) {
                // Tenter de récupérer la guilde pour le lien
                const guild = client.guilds.cache.get(config.guildId);
                if (guild) {
                     const voiceChannelLink = `[Cliquez ici pour rejoindre le salon vocal](https://discord.com/channels/${guild.id}/${event.voice_channel_id})`;
                     reminderEmbed.addFields({ name: "Accès au Salon Vocal", value: voiceChannelLink, inline: false });
                }
            }


            for (const participant of event.participants) {
                try {
                    const user = await client.users.fetch(participant.user_id);
                    await user.send({ embeds: [reminderEmbed] });
                    console.log(`[Scheduler] Rappel envoyé à ${user.tag} pour ${event.name}`);
                } catch (dmError) {
                    console.error(`Impossible d'envoyer un DM de rappel à ${participant.user_tag} (${participant.user_id}) pour l'événement ${event.name}:`, dmError);
                }
            }
            // Marquer l'événement comme ayant envoyé son rappel
            await ScheduledEvent.markReminderSent(event._id);
        }
    } catch (error) {
        console.error('Erreur lors de la vérification des rappels d\'événements :', error);
    }
}


client.once('ready', async () => {
    console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
    client.user.setActivity('Shindo Life RP', { type: ActivityType.Watching });

    // On passe maintenant client.commands à deployCommands
    await deployCommands(config.token, config.clientId, config.guildId, client.commands);

    // Démarrer le scheduler de rappels
    // Exécuter une première fois au démarrage
    checkAndSendReminders(client, config);
    // Puis toutes les REMINDER_CHECK_INTERVAL_MINUTES
    setInterval(() => checkAndSendReminders(client, config), config.REMINDER_CHECK_INTERVAL_MINUTES * 60 * 1000);
    console.log(`[Scheduler] Démarré: Vérification des rappels toutes les ${config.REMINDER_CHECK_INTERVAL_MINUTES} minutes.`);

    // keepAlive(); // Décommenter si vous utilisez une fonction keepAlive pour maintenir le bot actif sur Replit
});

client.on('interactionCreate', async interaction => {
    await handleInteraction(interaction, client, config);
});

// Événements pour les réactions (participation)
client.on('messageReactionAdd', (reaction, user) => {
    // Si la réaction est partielle, la fetch avant de la passer à handleInteraction
    if (reaction.partial) {
        reaction.fetch()
            .then(fullReaction => handleInteraction(fullReaction, client, config))
            .catch(error => console.error('Erreur lors du fetch de la réaction partielle (Add):', error));
    } else {
        handleInteraction(reaction, client, config);
    }
});

client.on('messageReactionRemove', (reaction, user) => {
    // Si la réaction est partielle, la fetch avant de la passer à handleInteraction
    if (reaction.partial) {
        reaction.fetch()
            .then(fullReaction => handleInteraction(fullReaction, client, config))
            .catch(error => console.error('Erreur lors du fetch de la réaction partielle (Remove):', error));
    } else {
        handleInteraction(reaction, client, config);
    }
});


client.login(config.token);

// Gestion des erreurs non capturées
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});