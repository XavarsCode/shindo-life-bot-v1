const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// ID du salon où les fiches RP doivent être envoyées
const FICHE_RP_CHANNEL_ID = '1397996090338578533';

// ID du salon où les logs doivent être envoyés
const LOGS_CHANNEL_ID = '1396956902373457930';

module.exports = {
    // Définition de la commande de slash
    data: new SlashCommandBuilder()
        .setName('fiche_rp_envoyer')
        .setDescription('Transforme un message existant en fiche RP et l\'envoie dans le salon des fiches.')
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription("L'ID du message à transformer en fiche RP.")
                .setRequired(true)),

    // Fonction d'exécution de la commande
    async execute(interaction) {
        // Répondre de manière éphémère pendant le traitement
        await interaction.deferReply({ ephemeral: true });

        const messageId = interaction.options.getString('message_id');
        const sourceChannel = interaction.channel; // Le canal où la commande a été exécutée (pour récupérer le message)
        const commandUser = interaction.user; // L'utilisateur qui a exécuté la commande

        let destinationChannel;
        let logsChannel;
        let targetMessageContent = "Contenu introuvable ou non lisible."; // Par défaut si non trouvé

        try {
            // Récupérer le message par son ID dans le canal source
            const targetMessage = await sourceChannel.messages.fetch(messageId);

            if (!targetMessage) {
                await interaction.editReply({ content: `Message avec l'ID \`${messageId}\` introuvable dans le salon où cette commande a été exécutée.`, ephemeral: true });
                return;
            }

            // Récupérer l'auteur et le contenu du message cible
            const author = targetMessage.author;
            targetMessageContent = targetMessage.content; // Assigner le contenu pour les logs

            // Créer l'embed de la fiche RP
            const ficheEmbed = new EmbedBuilder()
                .setColor(0x0099FF) // Une belle couleur bleue
                .setTitle(`Fiche RP de ${author.username}`)
                .setDescription(targetMessageContent)
                .setAuthor({ name: author.username, iconURL: author.displayAvatarURL() })
                .setTimestamp(targetMessage.createdAt) // Date de création du message original
                .setFooter({ text: `Message original posté dans #${sourceChannel.name}` });

            // --- ÉTAPE 1 : Envoyer la fiche RP au salon de destination ---
            destinationChannel = await interaction.client.channels.fetch(FICHE_RP_CHANNEL_ID);

            if (!destinationChannel) {
                await interaction.editReply({ content: `Le salon de destination des fiches RP (ID: \`${FICHE_RP_CHANNEL_ID}\`) est introuvable.`, ephemeral: true });
                return;
            }

            if (!destinationChannel.isTextBased()) {
                await interaction.editReply({ content: `Le salon de destination des fiches RP (ID: \`${FICHE_RP_CHANNEL_ID}\`) n'est pas un salon textuel valide.`, ephemeral: true });
                return;
            }

            await destinationChannel.send({ embeds: [ficheEmbed] });

            // --- ÉTAPE 2 : Envoyer un log au salon de logs ---
            logsChannel = await interaction.client.channels.fetch(LOGS_CHANNEL_ID);

            if (logsChannel && logsChannel.isTextBased()) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0xFFA500) // Couleur orange pour les logs
                    .setTitle("Commande /fiche_rp_envoyer exécutée")
                    .setDescription([
                        `**Exécutée par :** ${commandUser} (${commandUser.tag})`, // Mentionne l'utilisateur
                        `**ID du message source :** \`${messageId}\` (dans <#${sourceChannel.id}>)`,
                        `**Fiche envoyée vers :** <#${FICHE_RP_CHANNEL_ID}>`,
                        `**Contenu du message original :**\n\`\`\`\n${targetMessageContent.substring(0, 1000)}\n\`\`\`` // Limite à 1000 caractères
                    ].join('\n'))
                    .setTimestamp()
                    .setFooter({ text: `Commande exécutée depuis #${sourceChannel.name}` });

                // Optionnel : ajouter un champ pour le lien vers le message original si Discord le permet
                if (targetMessage.url) {
                    logEmbed.addFields(
                        { name: "Lien vers le message original", value: `[Cliquer ici](${targetMessage.url})`, inline: true }
                    );
                }

                await logsChannel.send({ embeds: [logEmbed] });
            } else {
                console.warn(`[WARNING] Le salon de logs (ID: ${LOGS_CHANNEL_ID}) est introuvable ou n'est pas un salon textuel. Le log n'a pas pu être envoyé.`);
            }

            // Confirmer à l'utilisateur que la fiche a été envoyée
            await interaction.editReply({ content: `La fiche RP a été envoyée avec succès dans <#${FICHE_RP_CHANNEL_ID}> !`, ephemeral: true });

        } catch (error) {
            console.error(`Erreur lors de l'exécution de /fiche_rp_envoyer: ${error}`);

            let errorMessage = "Une erreur est survenue lors de la création de la fiche RP.";
            if (error.code === 10008) { // Unknown Message
                errorMessage = `Message avec l'ID \`${messageId}\` introuvable ou non accessible dans le salon où cette commande a été exécutée.`;
            } else if (error.code === 50001) { // Missing Access (peut être pour le salon source ou destination/logs)
                 errorMessage = "Je n'ai pas la permission de lire les messages ou d'envoyer dans les salons nécessaires. Veuillez vérifier mes permissions.";
            } else if (error.message.includes("Invalid Form Body")) {
                errorMessage = "L'ID du message doit être un nombre valide.";
            }
            await interaction.editReply({ content: errorMessage, ephemeral: true });

            // Log d'erreur détaillé si possible
            if (logsChannel && logsChannel.isTextBased() && error.code !== 50001) {
                try {
                    const errorLogEmbed = new EmbedBuilder()
                        .setColor(0xFF0000) // Rouge pour les erreurs
                        .setTitle("Erreur dans /fiche_rp_envoyer")
                        .setDescription([
                            `**Exécutée par :** ${commandUser} (${commandUser.tag})`,
                            `**ID du message source tenté :** \`${messageId}\` (depuis <#${sourceChannel.id}>)`,
                            `**Message d'erreur :** \`${error.message}\``
                        ].join('\n'))
                        .setTimestamp();
                    await logsChannel.send({ embeds: [errorLogEmbed] });
                } catch (logError) {
                    console.error(`Erreur lors de l'envoi du log d'erreur : ${logError}`);
                }
            }
        }
    },
};