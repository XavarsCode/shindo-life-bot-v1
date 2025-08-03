// commands/slash/renommer.js
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('renommer')
        .setDescription('Renomme tous les joueurs sans rôle de personnage en "Nouveau Joueur".')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageNicknames), // Nécessite la permission "Gérer les surnoms"

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true }); // Mettre en attente la réponse car cela peut prendre du temps

        try {
            const guild = interaction.guild;
            const members = await guild.members.fetch(); // Récupère tous les membres

            let renamedCount = 0;
            const roleFound = false; // Mettez l'ID de votre rôle si vous en avez un pour les personnages

            // Cette partie dépend de votre logique de "rôle de personnage".
            // Par exemple, si vous avez un rôle spécifique pour les "personnages"
            // et que vous voulez renommer ceux qui N'ONT PAS ce rôle.
            // Si vous n'avez pas de rôle spécifique, cette logique doit être adaptée.

            // Exemple simplifié: renommer les membres qui n'ont pas un rôle 'Personnage'
            const roleToCheck = guild.roles.cache.find(role => role.name === 'Personnage' || role.id === 'YOUR_CHARACTER_ROLE_ID'); // Remplacez par le vrai rôle/ID si besoin

            for (const member of members.values()) {
                // Vérifie si le bot a la permission de renommer cet utilisateur
                if (member.manageable && member.id !== client.user.id && member.id !== guild.ownerId) {
                    // Si le membre n'a PAS le rôle de personnage OU si aucun rôle n'est défini pour la vérification
                    if (!roleToCheck || !member.roles.cache.has(roleToCheck.id)) {
                        try {
                            // Si le surnom actuel n'est PAS "Nouveau Joueur" pour éviter de renommer inutilement
                            if (member.nickname !== 'Nouveau Joueur') {
                                await member.setNickname('Nouveau Joueur');
                                renamedCount++;
                            }
                        } catch (renameError) {
                            console.warn(`Impossible de renommer ${member.user.tag}: ${renameError.message}`);
                        }
                    }
                }
            }

            if (renamedCount > 0) {
                await interaction.editReply(`✅ ${renamedCount} joueurs ont été renommés en "Nouveau Joueur".`);
            } else {
                await interaction.editReply('Aucun joueur n\'avait besoin d\'être renommé en "Nouveau Joueur".');
            }
        } catch (error) {
            console.error('Erreur lors de la commande /renommer:', error);
            await interaction.editReply('❌ Une erreur est survenue lors du renommage des joueurs. Vérifiez les permissions du bot.');
        }
    },
};