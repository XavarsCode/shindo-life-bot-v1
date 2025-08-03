// commands/slash/event.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType, Colors } = require('discord.js');
const moment = require('moment'); // Assurez-vous d'avoir 'moment' installé: npm install moment
const { serverStatus } = require('../../data/serverState');
const ScheduledEvent = require('../../models/ScheduledEvent');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('event')
        .setDescription('Gère les événements du serveur.')
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
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Arrête l\'événement en cours.')
                // .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild) // <-- SUPPRIMÉ D'ICI
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('programmer')
                .setDescription('Programme un événement pour une date et une heure futures.')
                .addStringOption(option => option.setName('nom').setDescription('Le nom de l\'événement').setRequired(true))
                .addIntegerOption(option => option.setName('heures').setDescription('Dans combien d\'heures l\'événement aura lieu.').setRequired(true))
                .addIntegerOption(option => option.setName('minutes').setDescription('Minutes supplémentaires (par ex. pour 1h30, mettez 30).').setRequired(false))
                .addStringOption(option => option.setName('description').setDescription('La description de l\'événement').setRequired(false))
                // .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild) // <-- SUPPRIMÉ D'ICI
        ),

    async execute(interaction, client, config) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.', ephemeral: true });
        }

        const subCommand = interaction.options.getSubcommand();

        if (subCommand === 'creer') {
            const eventName = interaction.options.getString('nom');
            const eventDescription = interaction.options.getString('description');
            const eventDuration = interaction.options.getInteger('duree');
            const eventType = interaction.options.getString('type');
            const customVoiceChannel = interaction.options.getChannel('salon_vocal_perso');

            if (!eventName || !eventDescription || !eventDuration || !eventType) {
                return interaction.reply({ content: 'Veuillez fournir toutes les informations nécessaires pour l\'événement (nom, description, durée, type).', ephemeral: true });
            }

            let voiceChannelID = null;
            if (customVoiceChannel) {
                if (customVoiceChannel.type === ChannelType.GuildVoice || customVoiceChannel.type === ChannelType.GuildStageVoice) {
                    voiceChannelID = customVoiceChannel.id;
                } else {
                    return interaction.reply({ content: 'Le salon vocal personnalisé doit être un salon vocal ou de scène.', ephemeral: true });
                }
            }

            const eventEmbed = new EmbedBuilder()
                .setColor(Colors.Blue)
                .setTitle(`🚨 Nouvel événement : ${eventName}`)
                .setDescription(`${eventDescription}\n\n**Type d'événement :** ${eventType === 'rp' ? 'Roleplay' : 'Mini-Jeu'}`)
                .addFields(
                    { name: "Durée Estimée", value: `${eventDuration} minutes`, inline: true },
                    { name: "Lancé par", value: `<@${interaction.user.id}>`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Rejoignez-nous pour cet événement !' });

            if (voiceChannelID) {
                eventEmbed.addFields({ name: "Accès au Salon Vocal", value: `[Cliquez ici pour rejoindre](https://discord.com/channels/${interaction.guild.id}/${voiceChannelID})`, inline: false });
            }

            const announceChannel = client.channels.cache.get(config.eventAnnounceChannelId);
            if (!announceChannel || announceChannel.type !== ChannelType.GuildText) {
                console.error(`Salon d'annonce des événements non trouvé ou n'est pas un salon textuel: ${config.eventAnnounceChannelId}`);
                return interaction.reply({ content: 'Le salon d\'annonce des événements n\'est pas configuré correctement. Veuillez contacter un administrateur.', ephemeral: true });
            }

            try {
                await serverStatus.updateEventStatus(true, eventName);

                await announceChannel.send({ embeds: [eventEmbed] });
                await interaction.reply({ content: `✅ L'événement "${eventName}" a été annoncé dans <#${announceChannel.id}> !`, ephemeral: true });
            } catch (error) {
                console.error('Erreur lors de l\'annonce de l\'événement :', error);
                await serverStatus.updateEventStatus(false, null);
                await interaction.reply({ content: 'Une erreur est survenue lors de l\'annonce de l\'événement. Veuillez réessayer.', ephemeral: true });
            }
        }

        else if (subCommand === 'stop') {
            // Vérification de permission pour la sous-commande 'stop'
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return interaction.reply({ content: 'Vous n\'avez pas la permission de gérer les événements.', ephemeral: true });
            }

            const eventChannelId = config.eventAnnounceChannelId;

            if (!eventChannelId) {
                return interaction.reply({ content: 'Le salon d\'annonce des événements n\'est pas configuré. Impossible d\'arrêter l\'événement.', ephemeral: true });
            }

            const eventChannel = client.channels.cache.get(eventChannelId);
            if (!eventChannel || eventChannel.type !== ChannelType.GuildText) {
                return interaction.reply({ content: 'Le salon d\'annonce des événements n\'a pas été trouvé ou n\'est pas un salon textuel valide.', ephemeral: true });
            }

            const stopEmbed = new EmbedBuilder()
                .setColor(Colors.Red)
                .setTitle('🛑 Événement Terminé !')
                .setDescription('L\'événement en cours a été arrêté par un membre du staff.')
                .setTimestamp()
                .setFooter({ text: 'Merci d\'avoir participé !' });

            try {
                await serverStatus.updateEventStatus(false, null);

                await eventChannel.send({ embeds: [stopEmbed] });
                await interaction.reply({ content: '✅ L\'événement a été arrêté et une annonce a été faite.', ephemeral: true });
            } catch (error) {
                console.error('Erreur lors de l\'arrêt de l\'événement :', error);
                await interaction.reply({ content: 'Une erreur est survenue lors de l\'arrêt de l\'événement. Veuillez réessayer.', ephemeral: true });
            }
        }

        else if (subCommand === 'programmer') {
            // Vérification de permission pour la sous-commande 'programmer'
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return interaction.reply({ content: 'Vous n\'avez pas la permission de gérer les événements.', ephemeral: true });
            }

            const nom = interaction.options.getString('nom');
            const heures = interaction.options.getInteger('heures');
            const minutes = interaction.options.getInteger('minutes') || 0;
            const description = interaction.options.getString('description') || 'Pas de description fournie.';

            const scheduledFor = moment().add(heures, 'hours').add(minutes, 'minutes').toDate();

            try {
                const newScheduledEvent = await ScheduledEvent.createEvent(
                    nom,
                    description,
                    scheduledFor,
                    interaction.user.id,
                    interaction.user.tag
                );

                const formattedTime = moment(scheduledFor).format('DD/MM/YYYY à HH:mm');

                const scheduleEmbed = new EmbedBuilder()
                    .setColor(Colors.Green)
                    .setTitle(`🗓️ Événement Programmé : ${nom}`)
                    .setDescription(`${description}\n\n**Date et Heure :** ${formattedTime} (<t:${Math.floor(scheduledFor.getTime() / 1000)}:R>)`)
                    .setTimestamp()
                    .setFooter({ text: 'Préparez-vous pour cet événement !' });

                const announceChannel = client.channels.cache.get(config.eventAnnounceChannelId);
                if (!announceChannel || announceChannel.type !== ChannelType.GuildText) {
                    console.error(`Salon d'annonce des événements non trouvé ou n'est pas un salon textuel: ${config.eventAnnounceChannelId}`);
                    await ScheduledEvent.markAsCancelled(newScheduledEvent.id);
                    return interaction.reply({ content: 'Le salon d\'annonce des événements n\'est pas configuré correctement pour programmer l\'événement. Veuillez contacter un administrateur.', ephemeral: true });
                }

                const announcedMessage = await announceChannel.send({ embeds: [scheduleEmbed] });
                await ScheduledEvent.updateAnnouncedMessageId(newScheduledEvent.id, announcedMessage.id);

                await interaction.reply({ content: `✅ L'événement "${nom}" a été programmé pour le ${formattedTime} et annoncé !`, ephemeral: true });
            } catch (error) {
                console.error('Erreur lors de la programmation de l\'événement :', error);
                await interaction.reply({ content: 'Une erreur est survenue lors de la programmation de l\'événement. Veuillez réessayer.', ephemeral: true });
            }
        }
    },
};