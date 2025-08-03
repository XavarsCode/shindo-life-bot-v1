// handlers/interactionHandler.js
const { PermissionsBitField, EmbedBuilder, ChannelType } = require('discord.js'); // Ajout de ChannelType si nécessaire ailleurs
const RpEntry = require('../models/RpEntry');
const { CUSTOM_IDS } = require('../utils/constants'); // <-- NOUVEAU: Import des constantes

async function handleInteraction(interaction, client, config) {
    // Vérification des permissions pour les commandes staff
    const isStaff = interaction.member && (
        interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
        (config.staffRoleId && interaction.member.roles.cache.has(config.staffRoleId)) || // Assurez-vous que config.staffRoleId est défini
        interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)
    );

    try {
        // --- Gestion des commandes de chat (Slash Commands) ---
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`Aucune commande slash "${interaction.commandName}" trouvée.`);
                return interaction.reply({ content: '❌ Cette commande n\'existe pas ou n\'est pas disponible actuellement.', ephemeral: true });
            }

            await command.execute(interaction, client, config);

        }
        // --- Gestion des commandes de menu contextuel ---
        else if (interaction.isContextMenuCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`Aucune commande contextuelle "${interaction.commandName}" trouvée.`);
                return interaction.reply({ content: '❌ Cette commande contextuelle n\'existe pas ou n\'est pas disponible.', ephemeral: true });
            }

            await command.execute(interaction, client, config);
        }
        // --- Gestion des soumissions de Modaux ---
        else if (interaction.isModalSubmit()) {
            // Les modaux doivent généralement être gérés par la commande qui les a affichés,
            // via interaction.awaitModalSubmit().
            // Si un modal est soumis "directement" au client.on('interactionCreate'),
            // vous auriez une logique de dispatch ici.
            // Par exemple, pour le modal de suivi RP:
            if (interaction.customId === CUSTOM_IDS.RP_FOLLOWUP_MODAL) {
                // Trouvez la commande "Suivi RP" et appelez sa méthode de gestion de modal.
                // Assurez-vous que rpFollowUpCommand.js exporte une méthode handleModalSubmit.
                const rpFollowUpCommand = client.commands.get('Suivi RP'); // Le nom de la commande contextuelle
                if (rpFollowUpCommand && rpFollowUpCommand.handleModalSubmit) {
                    await rpFollowUpCommand.handleModalSubmit(interaction, client, config);
                } else {
                    console.warn(`Aucun gestionnaire de soumission de modal (handleModalSubmit) trouvé pour la commande "Suivi RP".`);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ content: 'Une erreur interne est survenue (modal non géré).', ephemeral: true });
                    }
                }
            } else {
                console.warn(`Soumission de modal non gérée avec l'ID: "${interaction.customId}"`);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'Cette soumission de formulaire n\'est pas reconnue.', ephemeral: true });
                }
            }
        }
        // --- Gestion des interactions par Boutons ---
        else if (interaction.isButton()) {
            const { customId } = interaction;

            // Gestion des boutons de validation de Suivi RP
            if ([CUSTOM_IDS.RP_FOLLOWUP_APPROVE, CUSTOM_IDS.RP_FOLLOWUP_REJECT].includes(customId)) {
                if (!isStaff) {
                    return interaction.reply({ content: 'Vous n\'avez pas la permission de gérer ces suivis RP.', ephemeral: true });
                }

                const action = customId === CUSTOM_IDS.RP_FOLLOWUP_APPROVE ? 'approved' : 'rejected';
                const staffMember = interaction.user;

                const rpEntry = await RpEntry.findByValidationMessageId(interaction.message.id);

                if (!rpEntry) {
                    // Vérifier si le message a déjà été édité par un autre membre du staff (pour le cas où l'entrée DB est déjà partie)
                    try {
                        const originalEmbed = interaction.message.embeds[0];
                        if (originalEmbed && originalEmbed.title && (originalEmbed.title.includes('Validé') || originalEmbed.title.includes('Refusé'))) {
                            return interaction.reply({ content: 'Cette entrée RP a déjà été traitée par un autre membre du staff.', ephemeral: true });
                        }
                    } catch (e) { /* Ignorer l'erreur si l'embed n'est pas trouvable */ }
                    return interaction.reply({ content: 'Cette entrée RP n\'a pas été trouvée en base de données ou a déjà été traitée (message obsolète).', ephemeral: true });
                }

                if (rpEntry.status !== 'pending') {
                    return interaction.reply({ content: `Cette entrée RP a déjà été ${rpEntry.status === 'approved' ? 'validée' : 'refusée'} par ${rpEntry.validated_by_tag || 'un membre du staff'}.`, ephemeral: true });
                }

                const success = await RpEntry.updateStatus(rpEntry._id, action, staffMember.id, staffMember.tag);

                if (!success) {
                    return interaction.reply({ content: 'Une erreur est survenue lors de la mise à jour du statut de l\'entrée RP en base de données.', ephemeral: true });
                }

                // Mettre à jour l'embed du message de validation
                const originalEmbed = interaction.message.embeds[0];
                const updatedEmbed = EmbedBuilder.from(originalEmbed)
                    .setTitle(`Suivi RP ${action === 'approved' ? '✅ Validé' : '❌ Refusé'} : ${rpEntry.entry_title}`)
                    .setColor(action === 'approved' ? '#00FF00' : '#FF0000') // Vert pour validé, Rouge pour refusé
                    .addFields(
                        { name: 'Traitée par', value: `<@${staffMember.id}>`, inline: true },
                        { name: 'Date de traitement', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setFooter({ text: `ID Entrée BD: ${rpEntry._id}` });

                // Supprimer les boutons
                await interaction.update({ embeds: [updatedEmbed], components: [] });

                await interaction.followUp({ content: `Le suivi RP de <@${rpEntry.user_id}> pour "${rpEntry.entry_title}" a été ${action === 'approved' ? 'validé' : 'refusé'}.`, ephemeral: true });

                // Gérer l'envoi vers un autre salon si validé
                if (action === 'approved') {
                    const approvedChannel = client.channels.cache.get(config.rpApprovedChannelId);
                    if (approvedChannel) {
                        const publicEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle(`✅ Suivi RP Validé : ${rpEntry.entry_title}`)
                            .setDescription(rpEntry.entry_description)
                            .addFields(
                                { name: 'Joueur', value: `<@${rpEntry.user_id}>`, inline: true },
                                { name: 'Validé par', value: `<@${staffMember.id}>`, inline: true },
                                { name: 'Message d\'origine', value: `[Cliquer ici](${rpEntry.original_message_url})`, inline: false }
                            )
                            .setTimestamp(rpEntry.validation_date || Date.now());

                        if (rpEntry.image_link && rpEntry.image_link !== rpEntry.original_message_url) {
                            publicEmbed.addFields({ name: 'Lien/Preuve Supplémentaire', value: `[Cliquer ici](${rpEntry.image_link})`, inline: false });
                        }
                        if (rpEntry.image_link) {
                            publicEmbed.setImage(rpEntry.image_link);
                        } else if (rpEntry.original_message_url && rpEntry.original_message_url.match(/\.(jpeg|jpg|gif|png)$/i)) {
                            publicEmbed.setImage(rpEntry.original_message_url);
                        }

                        await approvedChannel.send({ embeds: [publicEmbed] });
                        console.log(`Suivi RP validé (ID BD: ${rpEntry._id}) reposté dans le salon d'archivage.`);
                    } else {
                        console.warn(`Salon d'archivage RP (ID: ${config.rpApprovedChannelId}) non trouvé. Le suivi validé n'a pas été reposté.`);
                    }
                }
            }
            // Gestion des boutons de pagination pour /suivis
            else if ([CUSTOM_IDS.PAGINATION_PREV_SUIVIS, CUSTOM_IDS.PAGINATION_NEXT_SUIVIS].includes(customId)) {
                // Cette interaction est gérée par le collector dans `playerCommands.executeSuivis`.
                // Cependant, si le collector a expiré, le bot doit répondre.
                // Si l'interaction n'a pas encore été répondue ou différée, c'est probablement que le collecteur a expiré.
                if (!interaction.replied && !interaction.deferred) {
                     await interaction.reply({ content: 'Cette session de navigation des suivis RP a expiré. Veuillez refaire la commande `/suivis`.', ephemeral: true });
                }
                // Si elle a été répondue/différée, le collecteur est censé la gérer.
            }
            else {
                // Si l'identifiant du bouton n'est pas reconnu, logguer et éventuellement répondre
                console.warn(`Bouton non géré: "${customId}"`);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'Ce bouton n\'est pas reconnu.', ephemeral: true });
                }
            }
        }
        // --- Fallback pour les types d'interaction non gérés ---
        else {
            console.warn(`Type d'interaction non géré: ${interaction.type}`); // Loguer les types inconnus
            return; // Ignorer les autres types d'interaction pour le moment
        }

    } catch (error) {
        console.error(`Erreur lors de l'exécution de l'interaction (type: ${interaction.type}, ID: ${interaction.customId || interaction.commandName || 'N/A'}):`, error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: '❌ Une erreur est survenue lors du traitement de votre demande.',
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: '❌ Une erreur est survenue lors du traitement de votre demande.',
                ephemeral: true
            });
        }
    }
}

module.exports = { handleInteraction };