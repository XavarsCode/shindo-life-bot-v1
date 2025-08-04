// events/messageReactionAdd.js
const { Events, EmbedBuilder, Colors, PermissionsBitField } = require('discord.js'); // Ajout de PermissionsBitField
const ScheduledEvent = require('../models/ScheduledEvent');
// const { PARTICIPATION_EMOJI, EVENT_ANNOUNCE_CHANNEL_ID } = require('../config'); // <--- SUPPRIMER CETTE LIGNE

module.exports = {
    name: Events.MessageReactionAdd,
    async execute(reaction, user, client, config) { // 'config' est passé ici
        // Ignorer les réactions du bot lui-même
        if (user.bot) return;

        // Si la réaction n'est pas sur une annonce d'événement dans le bon salon, ignorer
        if (reaction.message.channel.id !== config.EVENT_ANNOUNCE_CHANNEL_ID) return; // Utilisation de config

        // Assurez-vous que le message est dans le cache
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Erreur lors du fetch de la réaction :', error);
                return;
            }
        }

        // Vérifier si l'emoji est celui de participation configuré
        const reactionEmoji = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
        if (reactionEmoji !== config.PARTICIPATION_EMOJI) { // Utilisation de config
            // Si c'est un autre emoji, retirer la réaction (optionnel, pour garder le salon propre)
            if (reaction.message.channel.guild && reaction.message.channel.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                reaction.users.remove(user.id).catch(e => console.error("Erreur en retirant réaction non pertinente:", e));
            }
            return;
        }

        // Trouver l'événement programmé lié à ce message d'annonce
        // Nous cherchons l'événement par l'ID du message d'annonce
        const event = await ScheduledEvent.findByAnnouncedMessageId(reaction.message.id);

        if (!event) {
            // Si pas d'événement trouvé, on peut retirer la réaction (optionnel)
            if (reaction.message.channel.guild && reaction.message.channel.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                reaction.users.remove(user.id).catch(e => console.error("Erreur en retirant réaction sur message non-événement:", e));
            }
            return;
        }

        // Vérifier si l'utilisateur est déjà inscrit
        const isAlreadyParticipant = event.participants.some(p => p.user_id === user.id); // Accéder à event.participants
        if (isAlreadyParticipant) {
            // Informer l'utilisateur qu'il est déjà inscrit
            try {
                await user.send({ content: `Vous êtes déjà inscrit(e) à l'événement **${event.name}**.` }); // event.name
            } catch (dmError) {
                console.warn(`Impossible d'envoyer un DM à ${user.tag}: ${dmError.message}`);
            }
            // Retirer la réaction pour éviter les spams de confirmation (optionnel)
            if (reaction.message.channel.guild && reaction.message.channel.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                reaction.users.remove(user.id).catch(e => console.error("Erreur en retirant réaction d'un participant déjà inscrit:", e));
            }
            return;
        }


        // Stocker la requête de participation dans le modèle d'événement (en mémoire)
        ScheduledEvent.addParticipationRequest(user.id, event._id); // Utiliser _id de Mongoose

        // Envoyer un DM à l'utilisateur pour confirmer
        try {
            const confirmationEmbed = new EmbedBuilder()
                .setColor(Colors.Blue)
                .setTitle(`Confirmation d'inscription à l'événement "${event.name}"`) // event.name
                .setDescription(`Vous avez réagi au message d'annonce de l'événement **${event.name}**.

                Pour confirmer votre participation, répondez simplement **"oui"** à ce message.
                Pour annuler, répondez **"non"**.`)
                .addFields(
                    { name: "Description", value: event.description ? event.description.substring(0, 1024) : 'Pas de description.', inline: false }, // Gérer le cas où description est null
                    { name: "Programmé pour", value: `<t:${Math.floor(event.scheduled_for.getTime() / 1000)}:F>` } // event.scheduled_for
                )
                .setFooter({ text: 'Vous avez 5 minutes pour confirmer.' })
                .setTimestamp();

            await user.send({ embeds: [confirmationEmbed] });
            console.log(`DM de confirmation envoyé à ${user.tag} pour l'événement ${event.name}`);

            // Optionnel: retirer la réaction après l'envoi du DM pour éviter de le refaire
            if (reaction.message.channel.guild && reaction.message.channel.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                reaction.users.remove(user.id).catch(e => console.error("Erreur en retirant réaction après DM:", e));
            }

        } catch (dmError) {
            console.error(`Impossible d'envoyer un DM de confirmation à ${user.tag} : ${dmError.message}`);
            // Si le DM échoue, on retire la demande de participation et la réaction
            ScheduledEvent.removeParticipationRequest(user.id); // Pas besoin de eventId ici, la fonction gère
            if (reaction.message.channel.guild && reaction.message.channel.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                reaction.users.remove(user.id).catch(e => console.error("Erreur en retirant réaction après échec DM:", e));
            }
            // Informer l'utilisateur dans le salon (éphémère)
            const announceChannel = reaction.message.channel;
            if (announceChannel.isTextBased()) {
                announceChannel.send({ content: `${user}, je n'ai pas pu vous envoyer de DM de confirmation. Veuillez vérifier vos paramètres de confidentialité pour les messages directs.`, ephemeral: true }).catch(e => console.error("Erreur en envoyant message ephemere:", e));
            }
        }
    },
};