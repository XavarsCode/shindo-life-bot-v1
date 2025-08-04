const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js'); // Ajout de EmbedBuilder ici

module.exports = {
    // Définition de la commande de slash
    data: new SlashCommandBuilder()
        .setName('renommer')
        .setDescription('Renomme un utilisateur avec un format Prénom Clan / Pseudo Discord actuel.')
        .addStringOption(option =>
            option.setName('prenom')
                .setDescription('Le prénom à utiliser pour le nouveau surnom.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('clan')
                .setDescription('Le nom du clan à utiliser pour le nouveau surnom.')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription("L'utilisateur à renommer.")
                .setRequired(true)),

    // Fonction d'exécution de la commande
    async execute(interaction) {
        // Répondre de manière éphémère pendant le traitement
        await interaction.deferReply({ ephemeral: true });

        const prenom = interaction.options.getString('prenom');
        const clan = interaction.options.getString('clan');
        const targetUser = interaction.options.getUser('utilisateur'); // L'objet User (Discord global)
        const guildMember = await interaction.guild.members.fetch(targetUser.id); // L'objet GuildMember (représentation sur le serveur)

        if (!guildMember) {
            return interaction.editReply({ content: "Cet utilisateur n'est pas membre de ce serveur.", ephemeral: true });
        }

        // Vérifier si le bot a la permission de gérer les surnoms
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
            return interaction.editReply({ content: "Je n'ai pas la permission de **Gérer les surnoms** sur ce serveur.", ephemeral: true });
        }

        // Vérifier si le bot peut renommer cet utilisateur spécifique (hiérarchie des rôles)
        // Le bot ne peut pas renommer quelqu'un avec un rôle égal ou supérieur au sien.
        if (guildMember.manageable === false) {
             return interaction.editReply({ content: `Je ne peux pas renommer ${targetUser.tag} car son rôle est supérieur ou égal au mien dans la hiérarchie des rôles.`, ephemeral: true });
        }

        // Récupérer l'ancien surnom et le pseudo d'affichage actuel
        const oldNickname = guildMember.nickname || guildMember.user.username; // Si pas de surnom, prend le nom d'utilisateur
        const currentDisplayUsername = guildMember.displayName; // Nom d'affichage actuel (surnom ou nom d'utilisateur)

        // Construire le nouveau surnom
        let newNickname = `${prenom} ${clan} / ${currentDisplayUsername}`;

        // Limiter le surnom à 32 caractères
        if (newNickname.length > 32) {
             const basePrefix = `${prenom} ${clan} / `;
             const maxUsernameLength = 32 - basePrefix.length;

             if (maxUsernameLength > 0) {
                 newNickname = basePrefix + currentDisplayUsername.substring(0, maxUsernameLength);
             } else {
                 // Si même "Prénom Clan /" est déjà trop long, on coupe simplement
                 newNickname = newNickname.substring(0, 32);
             }
        }


        try {
            // Renommer le membre
            await guildMember.setNickname(newNickname);

            // --- NOUVEAU : Création de l'embed de confirmation ---
            const confirmationEmbed = new EmbedBuilder()
                .setColor(0x00FF00) // Vert
                .setTitle("✔ Utilisateur renommé !")
                .setDescription(`${targetUser.username} a été renommé en **${newNickname}**`) // Description concise
                .addFields(
                    { name: "Ancien Surnom", value: oldNickname, inline: true },
                    { name: "Nouveau Surnom", value: newNickname, inline: true },
                    { name: "Utilisateur Discord", value: `${targetUser} (\`${targetUser.tag}\`)`, inline: false } // Mentionne l'utilisateur
                )
                .setFooter({ text: `Commande exécutée par ${interaction.user.tag}` })
                .setTimestamp(); // Date et heure de l'exécution de la commande

            await interaction.editReply({
                embeds: [confirmationEmbed],
                ephemeral: false // Visible par tout le monde
            });

        } catch (error) {
            console.error(`Erreur lors du renommage de l'utilisateur : ${error}`);
            let errorMessage = "Une erreur est survenue lors du renommage.";

            if (error.code === 50013) { // Missing Permissions
                errorMessage = "Je n'ai pas la permission de renommer cet utilisateur. Vérifiez que j'ai la permission `Gérer les surnoms` et que mon rôle est au-dessus du sien.";
            } else if (error.code === 10007) { // Unknown Member
                errorMessage = "Cet utilisateur n'est plus sur le serveur.";
            } else {
                errorMessage = `Une erreur inattendue est survenue : ${error.message}`;
            }
            await interaction.editReply({ content: errorMessage, ephemeral: true });
        }
    },
};