// commands/slash/queue.js
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const QueueEntry = require('../../models/QueueEntry');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Gère la liste d\'attente du serveur (pour les events, etc.).')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild) // Permission générale pour la commande /queue
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Ajoute un utilisateur à la liste d\'attente.')
                .addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur à ajouter.').setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Retire un utilisateur de la liste d\'attente.')
                .addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur à retirer.').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Affiche la liste d\'attente.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Vide la liste d\'attente.')
                // .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // <-- SUPPRIMÉ ICI
        ),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.', ephemeral: true });
        }

        const subCommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('utilisateur');

        switch (subCommand) {
            case 'add':
                const userToAdd = targetUser || interaction.user;
                const existingEntry = await QueueEntry.findOne({ user_id: userToAdd.id });
                if (existingEntry) {
                    return interaction.reply({ content: `❌ ${userToAdd.tag} est déjà dans la liste d'attente.`, ephemeral: true });
                }
                await QueueEntry.addEntry(userToAdd.id, userToAdd.tag);
                const currentQueue = await QueueEntry.getQueue();
                await interaction.reply({ content: `✅ ${userToAdd.tag} a été ajouté à la liste d'attente. Position: ${currentQueue.length}`, ephemeral: false });
                break;
            case 'remove':
                if (!targetUser) {
                    return interaction.reply({ content: '❌ Veuillez spécifier l\'utilisateur à retirer.', ephemeral: true });
                }
                const result = await QueueEntry.removeEntry(targetUser.id);
                if (result.deletedCount === 0) {
                    return interaction.reply({ content: `❌ ${targetUser.tag} n'est pas dans la liste d'attente.`, ephemeral: true });
                }
                await interaction.reply({ content: `✅ ${targetUser.tag} a été retiré de la liste d'attente.`, ephemeral: false });
                break;
            case 'list':
                const queue = await QueueEntry.getQueue();
                if (queue.length === 0) {
                    return interaction.reply({ content: 'La liste d\'attente est actuellement vide.', ephemeral: false });
                }
                const queueList = queue.map((entry, index) => `${index + 1}. <@${entry.user_id}> (ajouté le <t:${Math.floor(entry.joined_at.getTime() / 1000)}:R>)`).join('\n');
                const embed = new EmbedBuilder()
                    .setTitle('Liste d\'attente')
                    .setDescription(queueList)
                    .setColor('#FFD700')
                    .setTimestamp();
                await interaction.reply({ embeds: [embed], ephemeral: false });
                break;
            case 'clear':
                // <-- AJOUT DE LA VÉRIFICATION DE PERMISSION ICI !
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return interaction.reply({ content: '❌ Vous n\'avez pas la permission de vider la liste d\'attente.', ephemeral: true });
                }
                await QueueEntry.clearQueue();
                await interaction.reply({ content: '✅ La liste d\'attente a été vidée.', ephemeral: false });
                break;
            default:
                await interaction.reply({ content: 'Sous-commande de queue inconnue.', ephemeral: true });
                break;
        }
    },
};