// commands/slash/spin.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('spin')
        .setDescription('Fais tourner une roue ou sélectionne un élément aléatoire.')
        .addStringOption(option =>
            option.setName('choix')
                .setDescription('Les choix séparés par des virgules (ex: choix1,choix2,choix3).')
                .setRequired(true)),

    async execute(interaction) {
        const choicesString = interaction.options.getString('choix');
        const choices = choicesString.split(',').map(choice => choice.trim()).filter(choice => choice.length > 0);

        if (choices.length === 0) {
            return interaction.reply({ content: '❌ Veuillez fournir au moins un choix valide (séparé par des virgules).', ephemeral: true });
        }

        const randomIndex = Math.floor(Math.random() * choices.length);
        const selectedChoice = choices[randomIndex];

        const embed = new EmbedBuilder()
            .setColor('#FFC0CB') // Rose
            .setTitle('🎡 Résultat du Spin !')
            .setDescription(`Les choix étaient : ${choices.map(c => `\`${c}\``).join(', ')}\n\n**Le résultat est... \`${selectedChoice}\` !**`)
            .setTimestamp()
            .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [embed], ephemeral: false });
    },
};