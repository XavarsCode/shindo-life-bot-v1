// commands/slash/joueurs.js (pas de changement majeur pour la persistance ici, dépend de l'API de jeu)
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
// Si vous interagissez avec un serveur de jeu (Minecraft, etc.), vous devrez importer la logique ici
// Par exemple: const { fetchMinecraftPlayers } = require('../../utils/minecraftAPI'); // Chemin à adapter

module.exports = {
    data: new SlashCommandBuilder()
        .setName('joueurs')
        .setDescription('Affiche la liste des joueurs connectés au serveur de jeu (si applicable).')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

    async execute(interaction, client, config) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: false });

        try {
            // Cette partie dépend entièrement de votre configuration de serveur de jeu.
            // Exemple conceptuel pour un serveur Minecraft via une API ou un module.
            // Si vous n'avez pas de serveur de jeu connecté, ce sera juste un message.

            // Remplacez cette logique par votre VRAIE interaction avec votre serveur de jeu
            // Par exemple, si vous avez une fonction pour récupérer les joueurs:
            // const players = await fetchMinecraftPlayers(config.minecraftServerAddress);

            const players = ['Joueur1 (ex. 1h)', 'Joueur2 (ex. 30min)', 'Joueur3 (ex. 2h)']; // Données d'exemple
            const maxPlayers = 70; // Exemple, peut venir de votre config ou de l'API du jeu

            let description = 'Information sur les joueurs connectés au serveur de jeu.';
            let fields = [];

            if (players && players.length > 0) {
                description = `Actuellement **${players.length}/${maxPlayers}** joueurs connectés :`;
                fields.push({ name: 'Liste des Joueurs', value: players.join('\n'), inline: false });
            } else {
                description = 'Aucun joueur n\'est actuellement connecté au serveur de jeu.';
            }

            const embed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle('🎮 Statut des Joueurs du Serveur de Jeu')
                .setDescription(description)
                .addFields(fields)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur lors de la commande /joueurs:', error);
            await interaction.editReply({ content: '❌ Une erreur est survenue lors de la récupération des joueurs du serveur de jeu. Vérifiez la connexion à l\'API du serveur.', ephemeral: true });
        }
    },
};