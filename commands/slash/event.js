// commands/slash/event.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType, Colors, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');
const moment = require('moment');
const { serverStatus } = require('../../data/serverState');
const ScheduledEvent = require('../../models/ScheduledEvent');
const { buildEventEmbed, buildEventCompletionEmbed } = require('../../handlers/interactionHandler'); // Importez les fonctions d'embed

module.exports = {
    data: new SlashCommandBuilder()
        .setName('event')
        .setDescription('Gère les événements du serveur.')
        // Sous-commande pour créer un événement immédiat
        .addSubcommand(subcommand =>
            subcommand
                .setName('creer')
                .setDescription('Crée un nouvel événement et l\'annonce.')
                .addStringOption(option => option.setName('nom').setDescription('Le nom de l\'événement.').setRequired(true))
                .addStringOption(option => option.setName('description').setDescription('Une brève description de l\'événement.').setRequired(true))
                .addIntegerOption(option => option.setName('duree').setDescription('La durée prévue de l\'événement en minutes.').setRequired(true))
                .addStringOption(option => option.setName('type').setDescription('Le type d\'événement : RP ou Mini-Jeu.').setRequired(true)
                    .addChoices({ name: 'Événement RP', value: 'rp' }, { name: 'Mini-Jeu', value: 'mini_jeu' }))
                .addChannelOption(option => option.setName('salon_vocal_perso').setDescription('Sélectionnez un salon vocal spécifique pour l\'événement (facultatif).').addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice).setRequired(false)))
        // Sous-commande pour arrêter/clôturer un événement (maintenant avec sélecteur)
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Arrête/Clôture un événement programmé ou en cours.')
        )
        // Sous-commande pour programmer un événement futur
        .addSubcommand(subcommand =>
            subcommand
                .setName('programmer')
                .setDescription('Programme un événement pour une date et une heure futures avec participation.')
                .addStringOption(option => option.setName('nom').setDescription('Le nom de l\'événement.').setRequired(true))
                .addIntegerOption(option => option.setName('heures').setDescription('Dans combien d\'heures l\'événement aura lieu.').setRequired(true))
                .addIntegerOption(option => option.setName('minutes').setDescription('Minutes supplémentaires (par ex. pour 1h30, mettez 30).').setRequired(false))
                .addStringOption(option => option.setName('description').setDescription('Une brève description de l\'événement.').setRequired(false))
                .addIntegerOption(option => option.setName('duree').setDescription('La durée prévue de l\'événement en minutes.').setRequired(false))
                .addStringOption(option => option.setName('type').setDescription('Le type d\'événement : RP ou Mini-Jeu.').setRequired(false)
                    .addChoices({ name: 'Événement RP', value: 'rp' }, { name: 'Mini-Jeu', value: 'mini_jeu' }))
                .addChannelOption(option => option.setName('salon_vocal_perso').setDescription('Sélectionnez un salon vocal spécifique pour l\'événement (facultatif).').addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice).setRequired(false))
        ),

    async execute(interaction, client, config) { // 'config' est passé ici
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.', ephemeral: true });
        }

        // Vérification des permissions commune à toutes les sous-commandes de gestion d'événements
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({ content: 'Vous n\'avez pas la permission de gérer les événements.', ephemeral: true });
        }

        const subCommand = interaction.options.getSubcommand();

        // --- Logique pour la sous-commande 'creer' ---
        if (subCommand === 'creer') {
            await interaction.deferReply({ ephemeral: true });

            const eventName = interaction.options.getString('nom');
            const eventDescription = interaction.options.getString('description');
            const eventDuration = interaction.options.getInteger('duree');
            const eventType = interaction.options.getString('type');
            const customVoiceChannel = interaction.options.getChannel('salon_vocal_perso');

            if (eventDuration <= 0) {
                return interaction.editReply({ content: 'La durée de l\'événement doit être un nombre positif en minutes.', ephemeral: true });
            }

            let voiceChannelID = null;
            if (customVoiceChannel) {
                if (customVoiceChannel.type === ChannelType.GuildVoice || customVoiceChannel.type === ChannelType.GuildStageVoice) {
                    voiceChannelID = customVoiceChannel.id;
                } else {
                    return interaction.editReply({ content: 'Le salon vocal personnalisé doit être un salon vocal ou de scène.', ephemeral: true });
                }
            }

            const announceChannel = client.channels.cache.get(config.EVENT_ANNOUNCE_CHANNEL_ID);
            if (!announceChannel || (announceChannel.type !== ChannelType.GuildText && announceChannel.type !== ChannelType.GuildAnnouncement)) {
                console.error(`Salon d'annonce des événements non trouvé ou n'est ni un salon textuel ni un salon d'annonce: ${config.EVENT_ANNOUNCE_CHANNEL_ID}`);
                return interaction.editReply({ content: 'Le salon d\'annonce des événements n\'est pas configuré correctement. Veuillez contacter un administrateur.', ephemeral: true });
            }

            try {
                // Créer un événement dans la base de données, marqué comme 'active'
                const newImmediateEvent = await ScheduledEvent.createEvent(
                    eventName,
                    eventDescription,
                    new Date(), // Date actuelle pour un événement immédiat
                    interaction.user.id,
                    interaction.user.tag,
                    eventDuration,
                    eventType,
                    voiceChannelID
                );
                await ScheduledEvent.findByIdAndUpdate(newImmediateEvent._id, { status: 'active' }); // Marque comme actif

                await serverStatus.updateEventStatus(true, eventName); // Met à jour le statut du serveur

                // Utilise buildEventEmbed pour l'annonce initiale (avec liste de participants vide)
                const eventEmbed = await buildEventEmbed(newImmediateEvent, config, interaction.guild);
                const announcedMessage = await announceChannel.send({ embeds: [eventEmbed] });
                await ScheduledEvent.updateAnnouncedMessageId(newImmediateEvent._id, announcedMessage.id); // Stocke l'ID du message d'annonce

                // Pas de réaction de participation pour les événements "creer" (immédiats) par défaut,
                // car ils sont censés commencer tout de suite. Si vous en voulez une, décommentez.
                // if (config.PARTICIPATION_EMOJI) {
                //     await announcedMessage.react(config.PARTICIPATION_EMOJI);
                // }

                await interaction.editReply({ content: `✅ L'événement "${eventName}" a été annoncé dans <#${announceChannel.id}> !`, ephemeral: true });
            } catch (error) {
                console.error('Erreur lors de l\'annonce de l\'événement :', error);
                await serverStatus.updateEventStatus(false, null); // Réinitialise le statut en cas d'erreur
                await interaction.editReply({ content: 'Une erreur est survenue lors de l\'annonce de l\'événement. Veuillez réessayer.', ephemeral: true });
            }
        }
        // --- Fin de la sous-commande 'creer' ---

        // --- Logique pour la sous-commande 'stop' (maintenant avec sélecteur) ---
        else if (subCommand === 'stop') {
            await interaction.deferReply({ ephemeral: true });

            // On veut lister les événements qui peuvent être "arrêtés" ou "clôturés"
            // C'est-à-dire ceux qui sont 'scheduled' ou 'active'
            const eventsToStop = await ScheduledEvent.find({
                status: { $in: ['scheduled', 'active'] }
            }).sort({ scheduled_for: 1 }); // Tri par date pour les plus proches

            if (eventsToStop.length === 0) {
                return interaction.editReply({ content: 'Il n\'y a aucun événement actif ou programmé à clôturer pour le moment.', ephemeral: true });
            }

            const selectOptions = eventsToStop.map(event => {
                const statusEmoji = event.status === 'scheduled' ? '🗓️' : '🚨';
                const formattedDate = moment(event.scheduled_for).format('DD/MM HH:mm');
                return new StringSelectMenuOptionBuilder()
                    .setLabel(`${statusEmoji} ${event.name} (${formattedDate})`)
                    .setValue(event._id.toString());
            });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_event_to_complete') // Utilisation d'un customId spécifique pour la clôture
                .setPlaceholder('Choisissez un événement à clôturer...')
                .addOptions(selectOptions);

            const actionRow = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.editReply({
                content: 'Quel événement souhaitez-vous clôturer ?',
                components: [actionRow],
                ephemeral: true
            });
        }
        // --- Fin de la sous-commande 'stop' ---

        // --- Logique pour la sous-commande 'programmer' ---
        else if (subCommand === 'programmer') {
            await interaction.deferReply({ ephemeral: true });

            const nom = interaction.options.getString('nom');
            const heures = interaction.options.getInteger('heures');
            const minutes = interaction.options.getInteger('minutes') || 0;
            const description = interaction.options.getString('description') || 'Pas de description fournie.';
            const duree = interaction.options.getInteger('duree');
            const type = interaction.options.getString('type');
            const customVoiceChannel = interaction.options.getChannel('salon_vocal_perso');

            if (heures < 0 || (heures === 0 && minutes < 1)) {
                return interaction.editReply({ content: 'Le temps de programmation doit être au moins 1 minute dans le futur.', ephemeral: true });
            }

            const scheduledFor = moment().add(heures, 'hours').add(minutes, 'minutes').toDate();

            let voiceChannelID = null;
            if (customVoiceChannel) {
                if (customVoiceChannel.type === ChannelType.GuildVoice || customVoiceChannel.type === ChannelType.GuildStageVoice) {
                    voiceChannelID = customVoiceChannel.id;
                } else {
                    return interaction.editReply({ content: 'Le salon vocal personnalisé doit être un salon vocal ou de scène.', ephemeral: true });
                }
            }

            try {
                const newScheduledEvent = await ScheduledEvent.createEvent(
                    nom,
                    description,
                    scheduledFor,
                    interaction.user.id,
                    interaction.user.tag,
                    duree,
                    type,
                    voiceChannelID
                );

                const announceChannel = client.channels.cache.get(config.EVENT_ANNOUNCE_CHANNEL_ID);
                if (!announceChannel || (announceChannel.type !== ChannelType.GuildText && announceChannel.type !== ChannelType.GuildAnnouncement)) {
                    console.error(`Salon d'annonce des événements non trouvé ou n'est ni un salon textuel ni un salon d'annonce: ${config.EVENT_ANNOUNCE_CHANNEL_ID}`);
                    await ScheduledEvent.markAsCancelled(newScheduledEvent.id);
                    return interaction.editReply({ content: 'Le salon d\'annonce des événements n\'est pas configuré correctement pour programmer l\'événement. Veuillez contacter un administrateur.', ephemeral: true });
                }

                // Utilise buildEventEmbed pour l'annonce initiale avec la liste des participants (vide au début)
                const scheduleEmbed = await buildEventEmbed(newScheduledEvent, config, interaction.guild);
                const announcedMessage = await announceChannel.send({ embeds: [scheduleEmbed] });
                await announcedMessage.react(config.PARTICIPATION_EMOJI); // Ajoute la réaction pour la participation

                await ScheduledEvent.updateAnnouncedMessageId(newScheduledEvent._id, announcedMessage.id);

                await interaction.editReply({ content: `✅ L'événement "${nom}" a été programmé pour le ${moment(scheduledFor).format('DD/MM/YYYY à HH:mm')} et annoncé ! Les utilisateurs peuvent maintenant s'inscrire en réagissant.`, ephemeral: true });
            } catch (error) {
                console.error('Erreur lors de la programmation de l\'événement :', error);
                await interaction.editReply({ content: 'Une erreur est survenue lors de la programmation de l\'événement. Veuillez réessayer.', ephemeral: true });
            }
        }
        // --- Fin de la sous-commande 'programmer' ---
    },
};