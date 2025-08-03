// commands/slash/tempban.js
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const TempBanEntry = require('../../models/TempBanEntry'); // <-- NOUVEAU

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempban')
        .setDescription('Bannit temporairement un utilisateur du serveur.')
        .addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur à bannir.').setRequired(true))
        .addIntegerOption(option => option.setName('duree').setDescription('Durée du bannissement en heures.').setRequired(true))
        .addStringOption(option => option.setName('raison').setDescription('La raison du bannissement.').setRequired(false))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('utilisateur');
        const durationHours = interaction.options.getInteger('duree');
        const reason = interaction.options.getString('raison') || 'Aucune raison fournie.';

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ content: '❌ Cet utilisateur n\'est pas un membre de ce serveur ou n\'a pas été trouvé.', ephemeral: true });
        }

        if (targetMember.id === interaction.user.id) {
            return interaction.reply({ content: '❌ Vous ne pouvez pas vous bannir vous-même.', ephemeral: true });
        }
        if (targetMember.id === interaction.client.user.id) {
            return interaction.reply({ content: '❌ Je ne peux pas me bannir moi-même.', ephemeral: true });
        }
        if (targetMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Vous ne pouvez pas bannir un administrateur.', ephemeral: true });
        }
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ content: '❌ Vous ne pouvez pas bannir quelqu\'un avec un rôle égal ou supérieur au vôtre.', ephemeral: true });
        }
        if (!targetMember.bannable) {
            return interaction.reply({ content: '❌ Je n\'ai pas les permissions nécessaires pour bannir cet utilisateur.', ephemeral: true });
        }

        try {
            const banDurationMs = durationHours * 60 * 60 * 1000;
            const banUntil = new Date(Date.now() + banDurationMs); // Date de fin du bannissement

            // Vérifier si l'utilisateur est déjà temporairement banni
            const existingBan = await TempBanEntry.getActiveBan(targetUser.id); // <-- NOUVEAU
            if (existingBan) {
                return interaction.reply({ content: `❌ L'utilisateur ${targetUser.tag} est déjà temporairement banni jusqu'au <t:${Math.floor(existingBan.ban_until.getTime() / 1000)}:F>.`, ephemeral: true });
            }

            const banEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🔨 Utilisateur Banni Temporairement')
                .setDescription(`**Utilisateur :** ${targetUser.tag} (<@${targetUser.id}>)`)
                .addFields(
                    { name: 'Durée', value: `${durationHours} heure(s)`, inline: true },
                    { name: 'Raison', value: reason, inline: true },
                    { name: 'Banni par', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Date de fin du bannissement', value: `<t:${Math.floor(banUntil.getTime() / 1000)}:F>`, inline: false }
                )
                .setTimestamp();

            await interaction.guild.members.ban(targetUser.id, { reason: `Tempban par ${interaction.user.tag} pour ${durationHours}h: ${reason}`, deleteMessageSeconds: 7 * 24 * 60 * 60 });

            // Enregistrer le bannissement temporaire dans la base de données
            await TempBanEntry.addBan( // <-- NOUVEAU
                targetUser.id,
                targetUser.tag,
                interaction.user.id,
                interaction.user.tag,
                reason,
                banUntil
            );

            await interaction.reply({ embeds: [banEmbed], ephemeral: false });

            // Le débannissement automatique sera géré par un système de vérification au démarrage ou un cron job
            // Ce setTimeout est juste pour l'exemple et ne persiste PAS au redémarrage du bot.
            // Pour un système robuste, vous devez implémenter une vérification régulière des bans expirés.
            setTimeout(async () => {
                try {
                    const banRecord = await TempBanEntry.getActiveBan(targetUser.id);
                    if (banRecord && banRecord.ban_until <= new Date()) { // Vérifier si le ban est toujours actif et expiré
                        await interaction.guild.members.unban(targetUser.id, 'Fin du bannissement temporaire.');
                        await TempBanEntry.removeBan(targetUser.id); // Supprimer l'entrée de la BDD
                        console.log(`Débanni temporaire de ${targetUser.tag} terminé.`);
                    }
                } catch (unbanError) {
                    console.error(`Erreur lors du débannissement automatique de ${targetUser.tag}:`, unbanError);
                }
            }, banDurationMs + 5000); // Ajouter un petit délai pour être sûr

        } catch (error) {
            console.error('Erreur lors de la commande /tempban:', error);
            await interaction.reply({ content: '❌ Une erreur est survenue lors du bannissement temporaire de l\'utilisateur.', ephemeral: true });
        }
    },
};