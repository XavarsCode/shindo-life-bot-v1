// commands/slash/info.js
const { SlashCommandBuilder, EmbedBuilder, version } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Affiche des informations sur le bot ou le serveur.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('bot')
                .setDescription('Affiche des informations sur le bot.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('Affiche des informations sur le serveur Discord.')),

    async execute(interaction, client) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.', ephemeral: true });
        }

        const subCommand = interaction.options.getSubcommand();

        if (subCommand === 'bot') {
            const botEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🤖 Informations sur le Bot')
                .addFields(
                    { name: 'Nom du Bot', value: client.user.tag, inline: true },
                    { name: 'ID du Bot', value: client.user.id, inline: true },
                    { name: 'Développeur', value: 'Piou29e', inline: true }, // Mettez votre nom/tag
                    { name: 'Nombre de Serveurs', value: client.guilds.cache.size.toString(), inline: true },
                    { name: 'Nombre d\'Utilisateurs', value: client.users.cache.size.toString(), inline: true },
                    { name: 'Discord.js Version', value: `v${version}`, inline: true },
                    { name: 'Uptime', value: `<t:${Math.floor(client.readyTimestamp / 1000)}:R>`, inline: true }
                )
                .setTimestamp();
            await interaction.reply({ embeds: [botEmbed], ephemeral: false });
        } else if (subCommand === 'server') {
            const guild = interaction.guild;
            const memberCount = guild.memberCount;
            const textChannels = guild.channels.cache.filter(c => c.type === 0).size; // ChannelType.GuildText
            const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size; // ChannelType.GuildVoice
            const roles = guild.roles.cache.size;

            const serverEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`🏠 Informations sur le Serveur : ${guild.name}`)
                .setThumbnail(guild.iconURL())
                .addFields(
                    { name: 'ID du Serveur', value: guild.id, inline: true },
                    { name: 'Propriétaire', value: `<@${guild.ownerId}>`, inline: true },
                    { name: 'Membres', value: memberCount.toString(), inline: true },
                    { name: 'Salons Textuels', value: textChannels.toString(), inline: true },
                    { name: 'Salons Vocaux', value: voiceChannels.toString(), inline: true },
                    { name: 'Rôles', value: roles.toString(), inline: true },
                    { name: 'Date de Création', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false }
                )
                .setTimestamp();
            await interaction.reply({ embeds: [serverEmbed], ephemeral: false });
        } else {
            await interaction.reply({ content: 'Sous-commande inconnue. Utilisez `/info bot` ou `/info server`.', ephemeral: true });
        }
    },
};