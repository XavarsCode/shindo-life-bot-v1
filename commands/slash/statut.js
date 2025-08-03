// commands/slash/statut.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { serverStatus } = require('../../data/serverState'); // <-- CORRECTION ICI !

module.exports = {
    data: new SlashCommandBuilder()
        .setName('statut')
        .setDescription('Affiche le statut actuel du serveur.'),

    async execute(interaction, client, config) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.', ephemeral: true });
        }

        try {
            // Récupérer le statut depuis l'instance de serverStatus
            // Note : serverStatus.getStatus() doit être une méthode que vous avez définie dans data/serverState.js
            // Si data/serverState.js expose directement les propriétés, vous n'auriez pas besoin de .getStatus()
            // et vous accèderiez directement à serverStatus.status, serverStatus.server_code, etc.
            // Je pars du principe que getStatus() est une méthode si vous l'avez utilisée.
            // Si ce n'est pas le cas, vous devriez simplement utiliser les propriétés directement comme serverStatus.status
            const currentStatus = await serverStatus.getStatus(); // <-- MODIFIÉ ICI (assurez-vous que getStatus existe)

            let title = 'Statut Actuel du Serveur';
            let description = 'Impossible de récupérer le statut. Veuillez réessayer plus tard.';
            let color = '#808080'; // Gris par défaut

            if (currentStatus) { // Utiliser 'currentStatus' car 'serverStatus' est l'objet importé
                switch (currentStatus.status) {
                    case 'online':
                        title = 'Serveur Actuellement Ouvert';
                        description = 'Le serveur est en ligne et accessible !';
                        color = '#00FF00'; // Vert
                        break;
                    case 'offline':
                        title = 'Serveur Actuellement Fermé';
                        description = 'Le serveur est actuellement hors ligne.';
                        color = '#FF0000'; // Rouge
                        break;
                    case 'maintenance':
                        title = 'Serveur en Maintenance';
                        description = 'Le serveur est actuellement en maintenance. Merci de votre patience !';
                        color = '#FFA500'; // Orange
                        break;
                    default:
                        break;
                }
            }

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(color)
                .setTimestamp();

            if (currentStatus && currentStatus.server_code) { // Utiliser server_code du modèle
                embed.addFields({ name: 'Code Serveur', value: `\`${currentStatus.server_code}\``, inline: true });
            }
            if (currentStatus && currentStatus.event_active) { // Afficher l'événement actif
                embed.addFields({ name: 'Événement en cours', value: currentStatus.event_name || 'Non spécifié', inline: true });
            }
            if (currentStatus && currentStatus.stats) { // Afficher les stats
                embed.addFields(
                    { name: 'Sessions Totales', value: currentStatus.stats.total_sessions.toString(), inline: true },
                    { name: 'Temps de jeu Total', value: `${currentStatus.stats.total_playtime} minutes`, inline: true },
                    { name: 'Dernière ouverture', value: currentStatus.stats.last_opened ? `<t:${Math.floor(currentStatus.stats.last_opened.getTime() / 1000)}:R>` : 'N/A', inline: true }
                );
            }

            await interaction.reply({ embeds: [embed], ephemeral: false });
        } catch (error) {
            console.error('Erreur lors de la commande /statut:', error);
            await interaction.reply({ content: '❌ Une erreur est survenue lors de la récupération du statut du serveur. Veuillez réessayer.', ephemeral: true });
        }
    },
};