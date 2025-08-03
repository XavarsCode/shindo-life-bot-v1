// commands/slash/stats.js (pour la persistance, vous auriez besoin d'un modèle PlayerStats)
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
// Si vous avez une base de données ou une API pour les stats, importez-la ici
// const PlayerStats = require('../../models/PlayerStats'); // Exemple de modèle PlayerStats

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Affiche les statistiques de jeu d\'un utilisateur.')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur dont vous voulez voir les stats (par défaut : vous-même).')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilisateur') || interaction.user;

        await interaction.deferReply({ ephemeral: false });

        try {
            // Cette partie dépend entièrement de votre système de statistiques.
            // C'est un placeholder.
            // Pour rendre cela persistant, vous feriez quelque chose comme :
            // const userStats = await PlayerStats.get(targetUser.id);

            // Données d'exemple (à remplacer par des données réelles de BDD)
            const exampleStats = {
                rpPoints: Math.floor(Math.random() * 1000) + 100,
                missionsCompleted: Math.floor(Math.random() * 50),
                eventsParticipated: Math.floor(Math.random() * 15),
                kills: Math.floor(Math.random() * 200),
                deaths: Math.floor(Math.random() * 100),
            };

            const embed = new EmbedBuilder()
                .setColor('#BADA55')
                .setTitle(`📊 Statistiques de ${targetUser.tag}`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setDescription(`Voici un aperçu des statistiques de jeu pour ${targetUser.tag}.`)
                .addFields(
                    { name: 'Points RP', value: exampleStats.rpPoints.toString(), inline: true },
                    { name: 'Missions Terminées', value: exampleStats.missionsCompleted.toString(), inline: true },
                    { name: 'Événements Participés', value: exampleStats.eventsParticipated.toString(), inline: true },
                    { name: 'Kills', value: exampleStats.kills.toString(), inline: true },
                    { name: 'Morts', value: exampleStats.deaths.toString(), inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur lors de la commande /stats:', error);
            await interaction.editReply({ content: '❌ Une erreur est survenue lors de la récupération des statistiques de l\'utilisateur.', ephemeral: true });
        }
    },
};