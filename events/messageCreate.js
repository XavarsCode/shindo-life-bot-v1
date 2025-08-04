// events/messageCreate.js
const { Events, EmbedBuilder, Colors, ChannelType } = require('discord.js');
const ScheduledEvent = require('../models/ScheduledEvent'); // Assurez-vous que le chemin est correct
const moment = require('moment');

module.exports = {
    name: Events.MessageCreate, // Nom de l'événement Discord à écouter
    async execute(message, client, config) { // 'config' est passé ici
        // Ignorer les messages du bot lui-même
        if (message.author.bot) return;

        // Ne traiter que les messages en DM (Direct Messages)
        if (message.channel.type !== ChannelType.DM) return;

        const userId = message.author.id;
        const userResponse = message.content.toLowerCase().trim();

        // Vérifier si cet utilisateur a une demande de participation en cours
        const eventId = ScheduledEvent.getParticipationRequest(userId);

        if (eventId) {
            // Si une demande est en cours, tenter de récupérer l'événement depuis la BDD
            const event = await ScheduledEvent.findById(eventId);

            if (!event) {
                // Si l'événement n'existe plus en BDD (ex: supprimé manuellement)
                ScheduledEvent.removeParticipationRequest(userId); // Nettoyer la requête en mémoire
                return message.channel.send("Désolé, l'événement pour lequel vous tentiez de confirmer n'existe plus ou n'est plus valide.");
            }

            if (userResponse === 'oui') {
                // L'utilisateur confirme sa participation
                const updatedEvent = await ScheduledEvent.addParticipant(event._id, userId, message.author.tag); // Ajouter le participant
                ScheduledEvent.removeParticipationRequest(userId); // Supprimer la requête après confirmation

                const successEmbed = new EmbedBuilder()
                    .setColor(Colors.Green)
                    .setTitle("✅ Participation Confirmée !")
                    .setDescription(`Votre participation à l'événement **${event.name}** a été enregistrée.
                    Nous vous attendons le **${moment(event.scheduled_for).format('DD/MM/YYYY à HH:mm')}** !`);

                // Ajout du lien vers le salon vocal si configuré
                if (event.voice_channel_id) {
                    // Trouver la guilde à partir du client pour obtenir son ID
                    // Cela suppose que le bot est dans la guilde où le salon vocal existe
                    const guild = client.guilds.cache.find(g => g.channels.cache.has(event.voice_channel_id));
                    if (guild) {
                        successEmbed.addFields({ name: "Salon Vocal", value: `[Cliquez ici pour rejoindre](https://discord.com/channels/${guild.id}/${event.voice_channel_id})`, inline: false });
                    }
                }

                await message.channel.send({ embeds: [successEmbed] });

                // Optionnel: Informer le staff ou un salon de logs que quelqu'un a participé
                // const logsChannel = client.channels.cache.get(config.RP_LOGS_CHANNEL_ID); // Supposons un ID de salon de logs dans vos secrets
                // if (logsChannel && logsChannel.isTextBased()) {
                //     logsChannel.send(`📢 ${message.author.tag} a confirmé sa participation à l'événement "${event.name}".`);
                // }

            } else if (userResponse === 'non') {
                // L'utilisateur annule sa participation ou refuse
                ScheduledEvent.removeParticipationRequest(userId); // Supprimer la requête
                await message.channel.send({ content: "Votre demande de participation a été annulée. Vous n'êtes pas inscrit(e) à cet événement." });
            } else {
                // Réponse invalide
                await message.channel.send({ content: "Réponse invalide. Veuillez répondre **'oui'** pour confirmer ou **'non'** pour annuler votre participation." });
            }
        }
    },
};