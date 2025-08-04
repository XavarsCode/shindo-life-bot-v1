// commands/slash/whitelist.js
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const WhitelistEntry = require('../../models/WhitelistEntry'); // <-- NOUVEAU

module.exports = {
    data: new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Gère la whitelist du serveur.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Ajoute un utilisateur à la whitelist.')
                .addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur à ajouter.').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Retire un utilisateur de la whitelist.')
                .addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur à retirer.').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Affiche la liste des utilisateurs whitelistés.')),

    async execute(interaction, client, config) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.', ephemeral: true });
        }

        const subCommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('utilisateur');

        switch (subCommand) {
            case 'add':
                const isAlreadyWhitelisted = await WhitelistEntry.isWhitelisted(user.id); // <-- MODIFICATION
                if (isAlreadyWhitelisted) {
                    return interaction.reply({ content: `❌ L'utilisateur ${user.tag} est déjà dans la whitelist.`, ephemeral: true });
                }
                await WhitelistEntry.addEntry(user.id, user.tag, interaction.user.tag); // <-- MODIFICATION
                await interaction.reply({ content: `✅ L'utilisateur ${user.tag} a été ajouté à la whitelist.`, ephemeral: true });
                console.log(`Whitelist: Ajout de ${user.tag} (${user.id}) par ${interaction.user.tag}`);
                break;
            case 'remove':
                const result = await WhitelistEntry.removeEntry(user.id); // <-- MODIFICATION
                if (result.deletedCount === 0) {
                    return interaction.reply({ content: `❌ L'utilisateur ${user.tag} n'est pas dans la whitelist.`, ephemeral: true });
                }
                await interaction.reply({ content: `✅ L'utilisateur ${user.tag} a été retiré de la whitelist.`, ephemeral: true });
                console.log(`Whitelist: Retrait de ${user.tag} (${user.id}) par ${interaction.user.tag}`);
                break;
            case 'list':
                const whitelist = await WhitelistEntry.getAllEntries(); // <-- MODIFICATION
                const userList = whitelist.map(entry => `<@${entry.user_id}> (ajouté par ${entry.added_by} le <t:${Math.floor(entry.added_at.getTime() / 1000)}:D>)`).join('\n') || 'Aucun utilisateur en whitelist.';
                const embed = new EmbedBuilder()
                    .setTitle('Liste de la Whitelist')
                    .setDescription(userList)
                    .setColor('#00FF00')
                    .setTimestamp();
                await interaction.reply({ embeds: [embed], ephemeral: true });
                console.log('Whitelist: Liste demandée.');
                break;
            default:
                await interaction.reply({ content: 'Sous-commande de whitelist inconnue.', ephemeral: true });
                break;
        }
    },
};