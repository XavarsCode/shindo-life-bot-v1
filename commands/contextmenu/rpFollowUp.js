// commands/contextmenu/rpFollowUp.js
const { ContextMenuCommandBuilder, ApplicationCommandType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, MessageFlags, Colors } = require('discord.js');
const RpEntry = require('../../models/RpEntry');
const { CUSTOM_IDS } = require('../../utils/constants');

const rpFollowUpCommand = {
    // === DÉFINITION DE LA COMMANDE CONTEXTUELLE (ESSENTIEL !) ===
    data: new ContextMenuCommandBuilder()
        .setName('Suivi RP') // C'est le nom qui apparaîtra dans le menu contextuel sur Discord
        .setType(ApplicationCommandType.Message), // Indique que c'est une commande de menu contextuel de type Message

    async execute(interaction, client, config) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.', flags: MessageFlags.Ephemeral });
        }

        const originalMessage = interaction.targetMessage; // Le message sur lequel l'utilisateur a fait un clic droit
        const originalMessageUrl = originalMessage ? originalMessage.url : null; // Récupérer l'URL ici

        // Créer le modal
        const modal = new ModalBuilder()
            .setCustomId(CUSTOM_IDS.RP_FOLLOWUP_MODAL) // Utilise la constante
            .setTitle('Soumettre un Suivi RP');

        const titleInput = new TextInputBuilder()
            .setCustomId(CUSTOM_IDS.RP_FOLLOWUP_TITLE_INPUT) // Utilise la constante
            .setLabel('Titre ou Catégorie du Suivi')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: Entraînement de Taijutsu, Combat contre X, Évolution Sharingan')
            .setRequired(true)
            .setMaxLength(100);

        const descriptionInput = new TextInputBuilder()
            .setCustomId(CUSTOM_IDS.RP_FOLLOWUP_DESCRIPTION_INPUT) // Utilise la constante
            .setLabel('Description de votre action RP')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Décrivez ce que vous avez fait en RP. Soyez...')
            .setRequired(true);

        const imageLinkInput = new TextInputBuilder()
            .setCustomId(CUSTOM_IDS.RP_FOLLOWUP_IMAGE_LINK_INPUT) // Utilise la constante
            .setLabel('Lien d\'image/preuve (optionnel)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Lien direct vers une image (jpg, png, gif) ou un lien Discord.')
            .setRequired(false);

        const originalMessageUrlHiddenInput = new TextInputBuilder()
            .setCustomId(CUSTOM_IDS.RP_FOLLOWUP_ORIGINAL_MSG_URL_HIDDEN) // Utilise la constante
            .setLabel('URL du message d\'origine (ne pas modifier)')
            .setStyle(TextInputStyle.Short)
            .setValue(originalMessageUrl || 'N/A')
            .setRequired(false);

        const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
        const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(imageLinkInput);
        const fourthActionRow = new ActionRowBuilder().addComponents(originalMessageUrlHiddenInput);

        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow);

        await interaction.showModal(modal);

        const filter = (modalInteraction) => modalInteraction.customId === CUSTOM_IDS.RP_FOLLOWUP_MODAL;
        try {
            // awaitModalSubmit gère déjà l'accusé de réception initial du modal.
            // Nous n'avons PAS besoin d'un deferReply() dans handleModalSubmit pour cette interaction.
            const modalSubmitInteraction = await interaction.awaitModalSubmit({ filter, time: 5 * 60 * 1000 });

            await this.handleModalSubmit(modalSubmitInteraction, client, config);

        } catch (error) {
            console.error('L\'utilisateur n\'a pas soumis le modal à temps ou une erreur est survenue :', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.followUp({ content: 'Vous n\'avez pas soumis le formulaire de suivi RP à temps ou une erreur est survenue.', flags: MessageFlags.Ephemeral });
            }
        }
    },

    async handleModalSubmit(modalSubmitInteraction, client, config) {
        // IMPORTANT : Pas de modalSubmitInteraction.deferReply() ici.
        // L'interaction a déjà été accusée de réception par awaitModalSubmit().
        // Toute réponse future doit être un editReply() ou followUp().

        const title = modalSubmitInteraction.fields.getTextInputValue(CUSTOM_IDS.RP_FOLLOWUP_TITLE_INPUT);
        const description = modalSubmitInteraction.fields.getTextInputValue(CUSTOM_IDS.RP_FOLLOWUP_DESCRIPTION_INPUT);
        const imageLink = modalSubmitInteraction.fields.getTextInputValue(CUSTOM_IDS.RP_FOLLOWUP_IMAGE_LINK_INPUT) || null;
        const originalMessageUrl = modalSubmitInteraction.fields.getTextInputValue(CUSTOM_IDS.RP_FOLLOWUP_ORIGINAL_MSG_URL_HIDDEN);

        const validationChannel = client.channels.cache.get(config.rpValidationChannelId);
        if (!validationChannel) {
            console.error(`Salon de validation RP non trouvé: ${config.rpValidationChannelId}`);
            // Comme l'interaction est déjà accusée de réception, utilisez editReply()
            await modalSubmitInteraction.editReply({ content: 'Le salon de validation RP n\'est pas configuré. Veuillez contacter un administrateur.', flags: MessageFlags.Ephemeral });
            return;
        }

        const approveButton = new ButtonBuilder()
            .setCustomId(CUSTOM_IDS.RP_FOLLOWUP_APPROVE)
            .setLabel('Valider')
            .setStyle(ButtonStyle.Success);

        const rejectButton = new ButtonBuilder()
            .setCustomId(CUSTOM_IDS.RP_FOLLOWUP_REJECT)
            .setLabel('Refuser')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(approveButton, rejectButton);

        const validationEmbed = new EmbedBuilder()
            .setColor(Colors.Orange)
            .setTitle(`📢 Nouveau Suivi RP à Valider : ${title}`)
            .setDescription(description)
            .addFields(
                { name: 'Joueur', value: `<@${modalSubmitInteraction.user.id}>`, inline: true },
                { name: 'Date de soumission', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Utilisez les boutons ci-dessous pour valider ou refuser.' });

        if (originalMessageUrl && originalMessageUrl !== 'N/A') {
            validationEmbed.addFields({ name: 'Message d\'origine', value: `[Cliquer ici](${originalMessageUrl})`, inline: false });
        }
        if (imageLink) {
            validationEmbed.setImage(imageLink);
            if (!originalMessageUrl || originalMessageUrl === 'N/A' || !imageLink.startsWith('https://cdn.discordapp.com/attachments/')) {
                validationEmbed.addFields({ name: 'Lien/Preuve Supplémentaire', value: `[Cliquer ici](${imageLink})`, inline: false });
            }
        }

        try {
            const validationMessage = await validationChannel.send({
                embeds: [validationEmbed],
                components: [row]
            });

            let newEntry = RpEntry.add( // Note: RpEntry.add est synchrone (pas besoin de await)
                modalSubmitInteraction.user.id,
                modalSubmitInteraction.user.tag,
                title,
                description,
                originalMessageUrl && originalMessageUrl !== 'N/A' ? originalMessageUrl : null,
                imageLink,
                validationMessage.id
            );

            // Maintenant, nous éditons la réponse différée par awaitModalSubmit()
            await modalSubmitInteraction.editReply({
                content: `✅ Votre suivi RP "${title}" a été soumis pour validation et sera examiné par le staff. (ID BD: ${newEntry ? newEntry.id : 'N/A'})`
            });
            console.log(`Suivi RP soumis par ${modalSubmitInteraction.user.tag} (ID BD: ${newEntry ? newEntry.id : 'N/A'})`);

        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'embed de validation ou de l\'ajout à la BD:', error);
            // En cas d'erreur, éditez la réponse déjà accusée de réception
            await modalSubmitInteraction.editReply({
                content: 'Une erreur est survenue lors de la soumission de votre suivi RP. Veuillez réessayer ou contacter un administrateur.'
            });
        }
    },
};

module.exports = rpFollowUpCommand;