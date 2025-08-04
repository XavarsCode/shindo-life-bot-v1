// handlers/interactionHandler.js
const { InteractionType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ChannelType, Colors, ButtonBuilder, ButtonStyle } = require('discord.js');
const ScheduledEvent = require('../models/ScheduledEvent');
const moment = require('moment');

// Fonction pour reconstruire l'embed de l'événement (pour l'annonce et les mises à jour de participation)
async function buildEventEmbed(event, config, guild) {
    const unixTimestamp = Math.floor(event.scheduled_for.getTime() / 1000);
    const formattedTime = moment(event.scheduled_for).format('DD/MM/YYYY à HH:mm');

    // Construire la liste des participants avec mentions
    let participantsList = '';
    if (event.participants && event.participants.length > 0) {
        // Limiter le nombre de participants affichés dans l'embed pour éviter les erreurs de taille
        // Discord a une limite de 4096 caractères par description/champ d'embed.
        // Une liste trop longue peut causer des erreurs.
        const maxParticipantsToShow = 20; // Ajustez si nécessaire, mais 20 est un bon début
        const displayedParticipants = event.participants.slice(0, maxParticipantsToShow);

        participantsList = displayedParticipants.map(p => `<@${p.user_id}>`).join('\n');
        if (event.participants.length > maxParticipantsToShow) {
            participantsList += `\n... et ${event.participants.length - maxParticipantsToShow} autres.`;
        }
    } else {
        participantsList = 'Aucun participant pour le moment.';
    }

    const embed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setTitle(`🗓️ Événement Programmé : ${event.name}`)
        .setDescription(`${event.description || 'Pas de description.'}\n\n**Date et Heure :** ${formattedTime} (<t:${unixTimestamp}:R>)\n\nRéagissez avec ${config.PARTICIPATION_EMOJI} pour participer et recevoir une confirmation en DM !`)
        .addFields(
            { name: `Participants (${event.participants.length})`, value: participantsList, inline: false } // Affiche les mentions des participants et le compte
        )
        .setTimestamp()
        .setFooter({ text: 'Préparez-vous pour cet événement !' });

    if (event.type) {
        embed.addFields({ name: "Type d'événement", value: event.type === 'rp' ? 'Roleplay' : 'Mini-Jeu', inline: true });
    }
    if (event.duration) {
        embed.addFields({ name: "Durée Estimée", value: `${event.duration} minutes`, inline: true });
    }
    if (event.voice_channel_id) {
        const voiceChannelLink = `[Cliquez ici pour rejoindre](https://discord.com/channels/${guild.id}/${event.voice_channel_id})`;
        embed.addFields({ name: "Accès au Salon Vocal", value: voiceChannelLink, inline: false });
    }
    return embed;
}

// Nouvelle fonction pour construire l'embed de clôture d'événement (message final)
async function buildEventCompletionEmbed(event, guild) {
    const formattedTime = moment(event.scheduled_for).format('DD/MM/YYYY à HH:mm');

    let participantsList = 'Aucun participant enregistré.';
    if (event.participants && event.participants.length > 0) {
        participantsList = event.participants.map(p => `<@${p.user_id}>`).join('\n');
    }

    const embed = new EmbedBuilder()
        .setColor(Colors.Blue)
        .setTitle(`✅ Événement Terminé : ${event.name}`)
        .setDescription(`L'événement initialement prévu le ${formattedTime} est maintenant terminé !`)
        .addFields(
            { name: `Participants finaux (${event.participants.length})`, value: participantsList, inline: false },
            { name: "Organisateur", value: `<@${event.created_by_id}>`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Merci à tous les participants !' });

    return embed;
}


async function handleInteraction(data, client, config) {

    // --- Gestion des interactions (Commandes Slash, Boutons, Modals, Sélecteurs) ---
    if ('type' in data && (data.isChatInputCommand || data.isMessageComponent || data.isModalSubmit)) {
        const interaction = data; // Renommer pour la clarté

        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`Aucune commande correspondant à ${interaction.commandName} n'a été trouvée.`);
                return;
            }

            try {
                await command.execute(interaction, client, config);
            } catch (error) {
                console.error(error);
                if (interaction.deferred || interaction.replied) {
                    await interaction.followUp({ content: 'Une erreur est survenue lors de l\'exécution de cette commande !', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'Une erreur est survenue lors de l\'exécution de cette commande !', ephemeral: true });
                }
            }
        }
        // --- Fin de la gestion des commandes Slash ---

        // --- Gestion des sélecteurs (StringSelectMenu) ---
        else if (interaction.isStringSelectMenu()) {
            // Sélecteur pour choisir un événement à modifier (depuis /event-commands modifier)
            if (interaction.customId === 'select_event_to_edit') {
                await interaction.deferUpdate();

                const selectedEventId = interaction.values[0];
                const eventToEdit = await ScheduledEvent.findById(selectedEventId);

                if (!eventToEdit) {
                    return interaction.followUp({ content: 'Cet événement n\'a pas été trouvé ou a été supprimé.', ephemeral: true });
                }

                const modal = new ModalBuilder()
                    .setCustomId(`edit_event_modal_${selectedEventId}`)
                    .setTitle(`Modifier l'événement : ${eventToEdit.name}`);

                const eventNameInput = new TextInputBuilder()
                    .setCustomId('edit_event_name')
                    .setLabel('Nouveau nom de l\'événement')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setPlaceholder(eventToEdit.name);

                const eventDescriptionInput = new TextInputBuilder()
                    .setCustomId('edit_event_description')
                    .setLabel('Nouvelle description (laisser vide pour inchangé)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
                    .setPlaceholder(eventToEdit.description || 'Pas de description');

                const eventDateInput = new TextInputBuilder()
                    .setCustomId('edit_event_date_time')
                    .setLabel('Nouvelle date et heure (JJ/MM/AAAA HH:MM)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setPlaceholder(moment(eventToEdit.scheduled_for).format('DD/MM/AAAA HH:mm'));

                const eventDurationInput = new TextInputBuilder()
                    .setCustomId('edit_event_duration')
                    .setLabel('Nouvelle durée en minutes (laisser vide pour inchangé)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setPlaceholder(eventToEdit.duration ? eventToEdit.duration.toString() : 'Non spécifié');

                const eventVoiceChannelInput = new TextInputBuilder()
                    .setCustomId('edit_event_voice_channel')
                    .setLabel('Nouvel ID de salon vocal (laisser vide pour inchangé ou "aucun")')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setPlaceholder(eventToEdit.voice_channel_id || 'Aucun');


                modal.addComponents(
                    new ActionRowBuilder().addComponents(eventNameInput),
                    new ActionRowBuilder().addComponents(eventDescriptionInput),
                    new ActionRowBuilder().addComponents(eventDateInput),
                    new ActionRowBuilder().addComponents(eventDurationInput),
                    new ActionRowBuilder().addComponents(eventVoiceChannelInput)
                );

                await interaction.showModal(modal);

            }
            // Sélecteur pour choisir un événement à supprimer (depuis /event-commands supprimer)
            else if (interaction.customId === 'select_event_to_delete') {
                await interaction.deferUpdate();

                const selectedEventId = interaction.values[0];
                const eventToDelete = await ScheduledEvent.findById(selectedEventId);

                if (!eventToDelete) {
                    return interaction.followUp({ content: 'Cet événement n\'a pas été trouvé ou a déjà été supprimé.', ephemeral: true });
                }

                const confirmEmbed = new EmbedBuilder()
                    .setColor(Colors.Orange)
                    .setTitle('Confirmer la suppression de l\'événement')
                    .setDescription(`Êtes-vous sûr de vouloir supprimer l'événement **${eventToDelete.name}** prévu pour le ${moment(eventToDelete.scheduled_for).format('DD/MM/AAAA à HH:mm')} ?`)
                    .setFooter({ text: 'Cette action est irréversible.' });

                const confirmButton = new ButtonBuilder()
                    .setCustomId(`confirm_delete_event_${selectedEventId}`)
                    .setLabel('Oui, supprimer')
                    .setStyle(ButtonStyle.Danger);

                const cancelButton = new ButtonBuilder()
                    .setCustomId('cancel_delete_event')
                    .setLabel('Non, annuler')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

                await interaction.editReply({
                    embeds: [confirmEmbed],
                    components: [row],
                    ephemeral: true
                });
            }
            // NOUVEAU: Sélecteur pour choisir un événement à clôturer (depuis /event stop)
            else if (interaction.customId === 'select_event_to_complete') {
                await interaction.deferUpdate();

                const selectedEventId = interaction.values[0];
                const eventToComplete = await ScheduledEvent.findById(selectedEventId);

                if (!eventToComplete) {
                    return interaction.followUp({ content: 'Cet événement n\'a pas été trouvé ou a déjà été clôturé/annulé.', ephemeral: true });
                }

                const confirmEmbed = new EmbedBuilder()
                    .setColor(Colors.Blue)
                    .setTitle('Confirmer la clôture de l\'événement')
                    .setDescription(`Êtes-vous sûr de vouloir clôturer l'événement **${eventToComplete.name}** prévu pour le ${moment(eventToComplete.scheduled_for).format('DD/MM/AAAA à HH:mm')} ?\n\nCela marquera l'événement comme terminé et affichera la liste des participants finaux dans le salon d'annonce.`)
                    .setFooter({ text: 'Cette action est irréversible.' });

                const confirmButton = new ButtonBuilder()
                    .setCustomId(`confirm_complete_event_${selectedEventId}`)
                    .setLabel('Oui, clôturer')
                    .setStyle(ButtonStyle.Success);

                const cancelButton = new ButtonBuilder()
                    .setCustomId('cancel_complete_event')
                    .setLabel('Non, annuler')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

                await interaction.editReply({
                    embeds: [confirmEmbed],
                    components: [row],
                    ephemeral: true
                });
            }
        }
        // --- Fin de la gestion des sélecteurs ---

        // --- Gestion des soumissions de Modal ---
        else if (interaction.type === InteractionType.ModalSubmit) {
            // Modal de modification d'événement
            if (interaction.customId.startsWith('edit_event_modal_')) {
                await interaction.deferReply({ ephemeral: true });

                const eventId = interaction.customId.split('_')[3];
                const eventToUpdate = await ScheduledEvent.findById(eventId);

                if (!eventToUpdate) {
                    return interaction.editReply({ content: 'L\'événement n\'a pas été trouvé pour la mise à jour.', ephemeral: true });
                }

                const newName = interaction.fields.getTextInputValue('edit_event_name');
                const newDescription = interaction.fields.getTextInputValue('edit_event_description');
                const newDateTimeStr = interaction.fields.getTextInputValue('edit_event_date_time');
                const newDurationStr = interaction.fields.getTextInputValue('edit_event_duration');
                const newVoiceChannelId = interaction.fields.getTextInputValue('edit_event_voice_channel');

                const updates = {};

                if (newName && newName !== eventToUpdate.name) {
                    updates.name = newName;
                }
                if (newDescription && newDescription !== eventToUpdate.description) {
                    updates.description = newDescription;
                }

                if (newDateTimeStr) {
                    const newScheduledFor = moment(newDateTimeStr, 'DD/MM/AAAA HH:mm', true);
                    if (newScheduledFor.isValid()) {
                        if (newScheduledFor.toDate().getTime() !== eventToUpdate.scheduled_for.getTime()) {
                            updates.scheduled_for = newScheduledFor.toDate();
                        }
                    } else {
                        return interaction.editReply({ content: 'Format de date et heure invalide (attendu: JJ/MM/AAAA HH:MM). La mise à jour a été annulée.', ephemeral: true });
                    }
                }

                if (newDurationStr) {
                    const newDuration = parseInt(newDurationStr);
                    if (!isNaN(newDuration) && newDuration >= 0) {
                         if (newDuration !== eventToUpdate.duration) {
                            updates.duration = newDuration;
                        }
                    } else {
                        return interaction.editReply({ content: 'La durée doit être un nombre positif. La mise à jour a été annulée.', ephemeral: true });
                    }
                }

                if (newVoiceChannelId !== eventToUpdate.voice_channel_id) {
                    if (newVoiceChannelId.toLowerCase() === 'aucun' || newVoiceChannelId.trim() === '') {
                        updates.voice_channel_id = null;
                    } else {
                        const channel = await client.channels.fetch(newVoiceChannelId).catch(() => null);
                        if (!channel || (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice)) {
                            return interaction.editReply({ content: 'ID de salon vocal invalide ou ce n\'est pas un salon vocal/de scène. La mise à jour a été annulée.', ephemeral: true });
                        }
                        updates.voice_channel_id = newVoiceChannelId;
                    }
                }

                if (Object.keys(updates).length === 0) {
                    return interaction.editReply({ content: 'Aucune modification détectée ou les valeurs fournies sont identiques aux actuelles.', ephemeral: true });
                }

                try {
                    const updatedEvent = await ScheduledEvent.updateEventFields(eventId, updates);

                    if (updatedEvent && updatedEvent.announced_message_id) {
                        const announceChannel = client.channels.cache.get(config.EVENT_ANNOUNCE_CHANNEL_ID);
                        if (announceChannel && (announceChannel.type === ChannelType.GuildText || announceChannel.type === ChannelType.GuildAnnouncement)) {
                            const oldMessage = await announceChannel.messages.fetch(updatedEvent.announced_message_id).catch(() => null);

                            if (oldMessage) {
                                // Reconstruire l'embed avec les nouvelles informations (y compris la liste des participants)
                                const newEmbed = await buildEventEmbed(updatedEvent, config, interaction.guild);
                                await oldMessage.edit({ embeds: [newEmbed] });
                            }
                        }
                    }

                    await interaction.editReply({ content: `✅ L'événement **${updatedEvent.name}** a été mis à jour avec succès !`, ephemeral: true });
                } catch (error) {
                    console.error('Erreur lors de la mise à jour de l\'événement :', error);
                    await interaction.editReply({ content: 'Une erreur est survenue lors de la mise à jour de l\'événement. Veuillez réessayer.', ephemeral: true });
                }
            }
        }
        // --- Fin de la gestion des soumissions de Modal ---

        // --- Gestion des boutons ---
        else if (interaction.isButton()) {
            // Bouton de confirmation de suppression d'événement
            if (interaction.customId.startsWith('confirm_delete_event_')) {
                await interaction.deferUpdate();

                const eventId = interaction.customId.split('_')[3];
                const eventToDelete = await ScheduledEvent.findById(eventId);

                if (!eventToDelete) {
                    return interaction.editReply({ content: 'Cet événement n\'a pas été trouvé ou a déjà été supprimé.', components: [], embeds: [], ephemeral: true });
                }

                try {
                    if (eventToDelete.announced_message_id) {
                        const announceChannel = client.channels.cache.get(config.EVENT_ANNOUNCE_CHANNEL_ID);
                        if (announceChannel) {
                            const oldMessage = await announceChannel.messages.fetch(eventToDelete.announced_message_id).catch(() => null);
                            if (oldMessage) {
                                await oldMessage.delete();
                            }
                        }
                    }

                    await ScheduledEvent.deleteEvent(eventId);

                    await interaction.editReply({ content: `✅ L'événement **${eventToDelete.name}** a été supprimé avec succès !`, components: [], embeds: [], ephemeral: true });
                } catch (error) {
                    console.error('Erreur lors de la suppression de l\'événement :', error);
                    await interaction.editReply({ content: 'Une erreur est survenue lors de la suppression de l\'événement. Veuillez réessayer.', components: [], embeds: [], ephemeral: true });
                }
            }
            // Bouton d'annulation de suppression d'événement
            else if (interaction.customId === 'cancel_delete_event') {
                await interaction.deferUpdate();
                await interaction.editReply({ content: 'La suppression de l\'événement a été annulée.', components: [], embeds: [], ephemeral: true });
            }
            // NOUVEAU: Bouton de confirmation de clôture d'événement
            else if (interaction.customId.startsWith('confirm_complete_event_')) {
                await interaction.deferUpdate();

                const eventId = interaction.customId.split('_')[3];
                const eventToComplete = await ScheduledEvent.findById(eventId);

                if (!eventToComplete) {
                    return interaction.editReply({ content: 'Cet événement n\'a pas été trouvé ou a déjà été clôturé/annulé.', components: [], embeds: [], ephemeral: true });
                }

                try {
                    // Marquer l'événement comme terminé dans la DB
                    const completedEvent = await ScheduledEvent.markAsCompleted(eventId);

                    // Envoyer le message de clôture avec la liste des participants
                    const announceChannel = client.channels.cache.get(config.EVENT_ANNOUNCE_CHANNEL_ID);
                    if (announceChannel && (announceChannel.type === ChannelType.GuildText || announceChannel.type === ChannelType.GuildAnnouncement)) {
                        const completionEmbed = await buildEventCompletionEmbed(completedEvent, interaction.guild);
                        await announceChannel.send({ embeds: [completionEmbed] });
                    } else {
                        console.error(`Salon d'annonce des événements non trouvé ou invalide pour l'envoi du message de clôture: ${config.EVENT_ANNOUNCE_CHANNEL_ID}`);
                    }

                    // Supprimer le message d'annonce original si existant
                    if (completedEvent.announced_message_id) {
                        if (announceChannel) {
                            const oldMessage = await announceChannel.messages.fetch(completedEvent.announced_message_id).catch(() => null);
                            if (oldMessage) {
                                await oldMessage.delete().catch(e => console.error("Erreur lors de la suppression de l'ancien message d'annonce:", e));
                            }
                        }
                    }

                    // Mettre à jour le statut du serveur si cet événement était le seul actif
                    const activeEvents = await ScheduledEvent.find({ status: 'active' });
                    if (activeEvents.length === 0) {
                        await serverStatus.updateEventStatus(false, null);
                    }

                    await interaction.editReply({ content: `✅ L'événement **${completedEvent.name}** a été clôturé avec succès ! Le récapitulatif a été envoyé dans le salon d'annonce.`, components: [], embeds: [], ephemeral: true });
                } catch (error) {
                    console.error('Erreur lors de la clôture de l\'événement :', error);
                    await interaction.editReply({ content: 'Une erreur est survenue lors de la clôture de l\'événement. Veuillez réessayer.', components: [], embeds: [], ephemeral: true });
                }
            }
            // Bouton d'annulation de clôture d'événement
            else if (interaction.customId === 'cancel_complete_event') {
                await interaction.deferUpdate();
                await interaction.editReply({ content: 'La clôture de l\'événement a été annulée.', components: [], embeds: [], ephemeral: true });
            }
        }
    }
    // --- Fin de la gestion des interactions ---

    // --- Gestion des réactions aux messages (pour la participation) ---
    else if ('partial' in data && 'emoji' in data) {
        const reaction = data;
        const user = reaction.users.cache.last();

        if (!user || user.id === client.user.id) return;

        // Vérifiez si la réaction est sur un message d'annonce d'événement et si c'est l'emoji de participation
        if (reaction.emoji.name === config.PARTICIPATION_EMOJI && reaction.message.channel.id === config.EVENT_ANNOUNCE_CHANNEL_ID) {
            const event = await ScheduledEvent.findByAnnouncedMessageId(reaction.message.id);

            if (event && event.status === 'scheduled') { // Seuls les événements 'scheduled' peuvent avoir des participants via réaction
                const isAdding = reaction.users.cache.has(user.id);

                if (isAdding) { // L'utilisateur vient d'ajouter la réaction (inscription)
                    try {
                        const isAlreadyParticipant = event.participants.some(p => p.user_id === user.id);
                        if (isAlreadyParticipant) {
                            await user.send(`Vous êtes déjà inscrit(e) pour l'événement **${event.name}**.`).catch(e => console.error(`Impossible d'envoyer un DM à ${user.tag} (déjà inscrit):`, e));
                            return;
                        }

                        const updatedEvent = await ScheduledEvent.addParticipant(event._id, user.id, user.tag);

                        // Mettre à jour l'embed du message d'annonce avec la nouvelle liste de participants
                        const announceChannel = client.channels.cache.get(config.EVENT_ANNOUNCE_CHANNEL_ID);
                        if (announceChannel) {
                            const messageToUpdate = await announceChannel.messages.fetch(event.announced_message_id).catch(() => null);
                            if (messageToUpdate) {
                                const newEmbed = await buildEventEmbed(updatedEvent, config, reaction.message.guild);
                                await messageToUpdate.edit({ embeds: [newEmbed] });
                            }
                        }
                        await user.send(`✅ Vous avez bien été enregistré(e) pour l'événement **${event.name}** prévu le ${moment(event.scheduled_for).format('DD/MM/YYYY à HH:mm')} !`);
                    } catch (error) {
                        console.error(`Impossible d'envoyer un DM à ${user.tag} ou d'ajouter le participant :`, error);
                        await reaction.users.remove(user.id).catch(e => console.error("Erreur lors du retrait de la réaction:", e));
                    }
                } else { // L'utilisateur vient de retirer la réaction (désinscription)
                    try {
                        const wasParticipant = event.participants.some(p => p.user_id === user.id);
                        if (!wasParticipant) {
                            return;
                        }

                        const updatedEvent = await ScheduledEvent.removeParticipant(event._id, user.id);

                        // Mettre à jour l'embed du message d'annonce avec la nouvelle liste de participants
                        const announceChannel = client.channels.cache.get(config.EVENT_ANNOUNCE_CHANNEL_ID);
                        if (announceChannel) {
                            const messageToUpdate = await announceChannel.messages.fetch(event.announced_message_id).catch(() => null);
                            if (messageToUpdate) {
                                const newEmbed = await buildEventEmbed(updatedEvent, config, reaction.message.guild);
                                await messageToUpdate.edit({ embeds: [newEmbed] });
                            }
                        }
                        await user.send(`❌ Vous avez bien été désinscrit(e) de l'événement **${event.name}**. Si c'est une erreur, réagissez de nouveau !`);
                    } catch (error) {
                        console.error(`Impossible d'envoyer un DM à ${user.tag} lors de la désinscription:`, error);
                    }
                }
            }
        }
    }
}

module.exports = { handleInteraction, buildEventEmbed, buildEventCompletionEmbed };