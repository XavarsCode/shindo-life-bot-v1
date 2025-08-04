// commands/slash/maintenance.js
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { serverStatus } = require('../../data/serverState'); // <-- CORRECTION ICI !

module.exports = {
    data: new SlashCommandBuilder()
        .setName('maintenance')
        .setDescription('Active/Désactive le statut de maintenance du serveur.')
        .addBooleanOption(option =>
            option.setName('etat')
                .setDescription('Vrai pour activer la maintenance, Faux pour la désactiver.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

    async execute(interaction, client, config) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.', ephemeral: true });
        }

        const etatMaintenance = interaction.options.getBoolean('etat');
        const channelId = config.channelId;

        if (!channelId) {
            return interaction.reply({ content: 'L\'ID du salon de statut n\'est pas configuré. Veuillez contacter un administrateur.', ephemeral: true });
        }

        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel || channel.type !== 0) {
                return interaction.reply({ content: 'Le salon configuré pour le statut n\'est pas un salon textuel valide.', ephemeral: true });
            }

            // Mettre à jour le statut de maintenance dans la base de données
            await serverStatus.updateMaintenanceMode(etatMaintenance); // <-- MODIFIÉ ICI

            let statusMessageId = await serverStatus.getMessageId(); // <-- MODIFIÉ ICI
            let statusMessage;

            const embed = new EmbedBuilder()
                .setTitle(etatMaintenance ? '⚠️ Serveur en Maintenance ⚠️' : '✅ Serveur en Ligne ✅')
                .setDescription(etatMaintenance ? 'Le serveur est actuellement en **MAINTENANCE**. Accès restreint.' : 'Le serveur est de nouveau **OUVERT** !')
                .setColor(etatMaintenance ? '#FFA500' : '#00FF00') // Orange pour maintenance, Vert pour ouvert
                .addFields({ name: 'Statut', value: etatMaintenance ? '⚠️ En Maintenance' : '🟢 Ouvert', inline: true })
                .setTimestamp();

            if (statusMessageId) {
                try {
                    statusMessage = await channel.messages.fetch(statusMessageId);
                    await statusMessage.edit({ embeds: [embed] });
                    await interaction.reply({ content: `✅ Le statut du serveur a été mis à jour : **${etatMaintenance ? 'EN MAINTENANCE' : 'OUVERT'}**.`, ephemeral: true });
                } catch (fetchError) {
                    console.error('Erreur lors de la récupération ou de la modification du message de statut existant:', fetchError);
                    statusMessage = await channel.send({ embeds: [embed] });
                    await serverStatus.updateMessageId(statusMessage.id); // <-- MODIFIÉ ICI
                    await interaction.reply({ content: `✅ Nouveau message de statut du serveur créé : **${etatMaintenance ? 'EN MAINTENANCE' : 'OUVERT'}**.`, ephemeral: true });
                }
            } else {
                statusMessage = await channel.send({ embeds: [embed] });
                await serverStatus.updateMessageId(statusMessage.id); // <-- MODIFIÉ ICI
                await interaction.reply({ content: `✅ Nouveau message de statut du serveur créé : **${etatMaintenance ? 'EN MAINTENANCE' : 'OUVERT'}**.`, ephemeral: true });
            }
        } catch (error) {
            console.error('Erreur lors de la commande /maintenance:', error);
            await interaction.reply({ content: '❌ Une erreur est survenue lors de la modification du statut de maintenance. Veuillez réessayer.', ephemeral: true });
        }
    },
};