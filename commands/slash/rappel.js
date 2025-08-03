// commands/slash/rappel.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ms = require('ms'); // Nécessite 'ms' : npm install ms

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rappel')
        .setDescription('Définit un rappel.')
        .addStringOption(option =>
            option.setName('temps')
                .setDescription('Le temps avant le rappel (ex: 10m, 2h, 3j).')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Le message du rappel.')
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.', ephemeral: true });
        }

        const time = interaction.options.getString('temps');
        const message = interaction.options.getString('message');

        const msTime = ms(time);

        if (!msTime || msTime < 1000) { // Minimum 1 seconde
            return interaction.reply({ content: '❌ Temps invalide. Utilisez des formats comme "10m", "2h", "3j".', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('Rappel Programmé')
            .setDescription(`Je vous rappellerai de : **${message}**`)
            .addFields(
                { name: 'Quand', value: `Dans ${time}`, inline: true },
                { name: 'À', value: `<t:${Math.floor((Date.now() + msTime) / 1000)}:F>`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: false }); // Rend le rappel visible pour tous

        setTimeout(async () => {
            try {
                const user = interaction.user;
                const reminderEmbed = new EmbedBuilder()
                    .setColor('#FF5733')
                    .setTitle('🔔 Rappel !')
                    .setDescription(`"${message}"`)
                    .addFields({ name: 'Définie par', value: `<@${user.id}>` })
                    .setTimestamp();

                await user.send({ embeds: [reminderEmbed] }).catch(err => {
                    console.error(`Impossible d'envoyer le MP à ${user.tag}:`, err);
                    // Si le MP échoue, tentez d'envoyer dans le canal d'origine
                    interaction.channel.send({ content: `<@${user.id}>, voici votre rappel :`, embeds: [reminderEmbed] }).catch(chErr => {
                        console.error(`Impossible d'envoyer le rappel dans le canal:`, chErr);
                    });
                });
            } catch (error) {
                console.error('Erreur lors de l\'envoi du rappel:', error);
            }
        }, msTime);
    },
};