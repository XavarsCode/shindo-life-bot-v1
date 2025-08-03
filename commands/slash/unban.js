// commands/slash/unban.js
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const TempBanEntry = require('../../models/TempBanEntry'); // <-- NOUVEAU

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Débannit un utilisateur du serveur.')
        .addStringOption(option => option.setName('id_utilisateur').setDescription('L\'ID de l\'utilisateur à débannir.').setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.', ephemeral: true });
        }

        const userId = interaction.options.getString('id_utilisateur');

        if (!/^\d+$/.test(userId)) {
            return interaction.reply({ content: '❌ L\'ID utilisateur fourni n\'est pas valide (doit être numérique).', ephemeral: true });
        }

        try {
            const bannedUsers = await interaction.guild.bans.fetch();
            const bannedUser = bannedUsers.find(ban => ban.user.id === userId);

            if (!bannedUser) {
                return interaction.reply({ content: '❌ Cet utilisateur n\'est pas banni du serveur.', ephemeral: true });
            }

            await interaction.guild.members.unban(userId, `Débanni par ${interaction.user.tag}.`);
            await TempBanEntry.removeBan(userId); // Supprimer l'entrée de ban temporaire si elle existe <-- NOUVEAU

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Utilisateur Débanni')
                .setDescription(`**Utilisateur :** ${bannedUser.user.tag} (<@${userId}>)`)
                .addFields(
                    { name: 'Débanni par', value: `${interaction.user.tag}`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: false });

        } catch (error) {
            console.error('Erreur lors de la commande /unban:', error);
            await interaction.reply({ content: '❌ Une erreur est survenue lors du débannissement de l\'utilisateur. Assurez-vous que l\'ID est correct et que le bot a les permissions nécessaires.', ephemeral: true });
        }
    },
};