// commands/slash/suivis.js
const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const RpEntry = require('../../models/RpEntry'); // <-- CORRECTION DU CHEMIN
const { CUSTOM_IDS } = require('../../utils/constants'); // <-- CORRECTION DU CHEMIN

module.exports = {
    // Définition de la commande Slash /suivis
    data: new SlashCommandBuilder()
        .setName('suivis')
        .setDescription('Affiche la liste de vos suivis RP validés.')
        .setDMPermission(false), // Recommandé si la commande utilise des IDs de salon spécifiques ou la base de données de guilde

    // Logique d'exécution de la commande /suivis
    async execute(interaction, client, config) {
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;
        // Récupérer les entrées RP validées pour l'utilisateur depuis la base de données
        const approvedEntries = await RpEntry.getApprovedEntriesByUser(userId);

        if (approvedEntries.length === 0) {
            return interaction.editReply({ content: 'Vous n\'avez aucun suivi RP validé pour le moment.' });
        }

        const entriesPerPage = 5; // Nombre de suivis par page
        let currentPage = 0; // Page actuelle, commence à 0

        // Fonction pour générer l'embed de la page actuelle
        const generateEmbed = (page) => {
            const start = page * entriesPerPage;
            const end = start + entriesPerPage;
            const currentEntries = approvedEntries.slice(start, end);

            const fields = currentEntries.map((entry, index) => {
                let value = `*Titre:* **${entry.entry_title}**\n`;
                value += `*Description:* ${entry.entry_description.length > 100 ? entry.entry_description.substring(0, 97) + '...' : entry.entry_description}\n`;
                // Assurez-vous que validation_date est un objet Date pour getTime()
                value += `*Validé le:* <t:${Math.floor(entry.validation_date.getTime() / 1000)}:D>\n`;
                if (entry.original_message_url) {
                    value += `[Message original](${entry.original_message_url})\n`;
                }
                if (entry.image_link && entry.image_link !== entry.original_message_url) {
                    value += `[Preuve/Lien suppl.](${entry.image_link})\n`;
                }
                return { name: `Suivi #${approvedEntries.indexOf(entry) + 1}`, value: value, inline: false };
            });

            const embed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle(`📜 Vos Suivis RP Validés (${approvedEntries.length})`)
                .setDescription(`Page ${page + 1}/${Math.ceil(approvedEntries.length / entriesPerPage)}`)
                .addFields(fields)
                .setTimestamp();

            return embed;
        };

        // Fonction pour générer les boutons de pagination
        const getPaginationRow = (page) => {
            const row = new ActionRowBuilder();
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(CUSTOM_IDS.PAGINATION_PREV_SUIVIS) // Utilise la constante pour l'ID
                    .setLabel('Précédent')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0), // Désactiver si c'est la première page
                new ButtonBuilder()
                    .setCustomId(CUSTOM_IDS.PAGINATION_NEXT_SUIVIS) // Utilise la constante pour l'ID
                    .setLabel('Suivant')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page >= Math.ceil(approvedEntries.length / entriesPerPage) - 1), // Désactiver si c'est la dernière page
            );
            return row;
        };

        // Envoyer la première page des suivis avec les boutons de pagination
        let message = await interaction.editReply({
            embeds: [generateEmbed(currentPage)],
            components: [getPaginationRow(currentPage)],
            ephemeral: true,
            fetchReply: true // Nécessaire pour créer un collector sur ce message
        });

        // Créer un collecteur de réactions pour les boutons
        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id && [CUSTOM_IDS.PAGINATION_PREV_SUIVIS, CUSTOM_IDS.PAGINATION_NEXT_SUIVIS].includes(i.customId),
            time: 5 * 60 * 1000 // Le collecteur expire après 5 minutes
        });

        collector.on('collect', async i => {
            if (i.customId === CUSTOM_IDS.PAGINATION_NEXT_SUIVIS) {
                currentPage++;
            } else if (i.customId === CUSTOM_IDS.PAGINATION_PREV_SUIVIS) {
                currentPage--;
            }

            // Mettre à jour le message avec la nouvelle page
            await i.update({
                embeds: [generateEmbed(currentPage)],
                components: [getPaginationRow(currentPage)]
            });
        });

        collector.on('end', async collected => {
            // Désactiver les boutons de pagination une fois le collecteur expiré
            try {
                const endedMessage = await interaction.fetchReply(); // Récupérer le message final
                const disabledRow = getPaginationRow(currentPage);
                disabledRow.components.forEach(button => button.setDisabled(true)); // Désactiver tous les boutons
                await endedMessage.edit({ components: [disabledRow] });
                console.log(`Collector pour les suivis RP de ${interaction.user.tag} terminé. ${collected.size} interactions collectées.`);
            } catch (error) {
                console.error('Erreur lors de la désactivation des boutons de pagination:', error);
            }
        });
    },
};