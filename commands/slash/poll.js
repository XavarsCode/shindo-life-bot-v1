// commands/slash/poll.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Crée un sondage simple.')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('La question du sondage.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('choix1')
                .setDescription('Le premier choix.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('choix2')
                .setDescription('Le deuxième choix.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('choix3')
                .setDescription('Le troisième choix (optionnel).')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('choix4')
                .setDescription('Le quatrième choix (optionnel).')
                .setRequired(false)),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.', ephemeral: true });
        }

        const question = interaction.options.getString('question');
        const choices = [];
        for (let i = 1; i <= 4; i++) {
            const choice = interaction.options.getString(`choix${i}`);
            if (choice) {
                choices.push(choice);
            }
        }

        if (choices.length < 2) {
            return interaction.reply({ content: '❌ Un sondage nécessite au moins deux choix.', ephemeral: true });
        }

        const emojiMap = ['1️⃣', '2️⃣', '3️⃣', '4️⃣']; // Utilisez des emojis pour les options

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`📊 Sondage : ${question}`)
            .setDescription('Votez en cliquant sur le bouton correspondant !')
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        const buttonsRow = new ActionRowBuilder();
        for (let i = 0; i < choices.length; i++) {
            embed.addFields({ name: `${emojiMap[i]} ${choices[i]}`, value: ' ', inline: false }); // Espace pour garder le format
            buttonsRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`poll_vote_${i}`)
                    .setLabel(choices[i])
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(emojiMap[i])
            );
        }

        await interaction.reply({ embeds: [embed], components: [buttonsRow] });

        // Note: La logique de comptage des votes n'est pas incluse ici.
        // Cela nécessiterait un système de base de données pour stocker les votes
        // et une gestion des clics de boutons dans l'interactionHandler.
        // Pour un sondage simple, les réactions sont parfois plus faciles à gérer sans BDD.
    },
};