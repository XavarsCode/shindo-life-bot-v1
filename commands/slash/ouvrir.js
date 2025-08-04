// commands/slash/ouvrir.js
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { serverStatus } = require('../../data/serverState'); // <-- CORRECTION ICI !

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ouvrir')
        .setDescription('Ouvre le serveur et met à jour son statut.')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('Le code du serveur privé (si applicable).')
                .setRequired(false)) // Changé en false car le code n'est pas toujours requis
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild), // Nécessite la permission "Gérer le serveur"

    async execute(interaction, client, config) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.', ephemeral: true });
        }

        const code = interaction.options.getString('code');
        const channelId = config.channelId; // L'ID du salon où le message de statut est posté

        if (!channelId) {
            return interaction.reply({ content: 'L\'ID du salon de statut n\'est pas configuré. Veuillez contacter un administrateur.', ephemeral: true });
        }

        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel || channel.type !== 0) { // 0 est ChannelType.GuildText
                return interaction.reply({ content: 'Le salon configuré pour le statut n\'est pas un salon textuel valide.', ephemeral: true });
            }

            // Mettre à jour le statut dans la base de données
            await serverStatus.updateStatus('online', code); // <-- MODIFIÉ ICI

            // Mettre à jour le message existant ou en créer un nouveau
            let statusMessageId = await serverStatus.getMessageId(); // <-- MODIFIÉ ICI
            let statusMessage;

            const embed = new EmbedBuilder()
                .setTitle('Serveur Ouvert')
                .setDescription(`Le serveur est maintenant **OUVERT** !`)
                .setColor('#00FF00') // Vert
                .addFields({ name: 'Statut', value: '✅ En Ligne', inline: true });

            if (code) {
                embed.addFields({ name: 'Code Serveur', value: `\`${code}\``, inline: true });
            }
            embed.setTimestamp();

            if (statusMessageId) {
                try {
                    statusMessage = await channel.messages.fetch(statusMessageId);
                    await statusMessage.edit({ embeds: [embed] });
                    await interaction.reply({ content: '✅ Le statut du serveur a été mis à jour : **OUVERT**.', ephemeral: true });
                } catch (fetchError) {
                    console.error('Erreur lors de la récupération ou de la modification du message de statut existant:', fetchError);
                    // Si le message n'existe plus, on en crée un nouveau
                    statusMessage = await channel.send({ embeds: [embed] });
                    await serverStatus.updateMessageId(statusMessage.id); // Sauvegarder le nouvel ID <-- MODIFIÉ ICI
                    await interaction.reply({ content: '✅ Nouveau message de statut du serveur créé : **OUVERT**.', ephemeral: true });
                }
            } else {
                statusMessage = await channel.send({ embeds: [embed] });
                await serverStatus.updateMessageId(statusMessage.id); // Sauvegarder le nouvel ID <-- MODIFIÉ ICI
                await interaction.reply({ content: '✅ Nouveau message de statut du serveur créé : **OUVERT**.', ephemeral: true });
            }
        } catch (error) {
            console.error('Erreur lors de la commande /ouvrir:', error);
            await interaction.reply({ content: '❌ Une erreur est survenue lors de l\'ouverture du serveur. Veuillez réessayer.', ephemeral: true });
        }
    },
};