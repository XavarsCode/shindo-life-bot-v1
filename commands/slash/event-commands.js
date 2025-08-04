// commands/slash/event-commands.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, Colors } = require('discord.js');
const ScheduledEvent = require('../../models/ScheduledEvent'); // Assurez-vous du chemin correct
const moment = require('moment'); // Importez moment

module.exports = {
    data: new SlashCommandBuilder()
        .setName('event-commands')
        .setDescription('Gère les événements programmés (modifier, supprimer, lister).')
        // Sous-commande pour modifier un événement
        .addSubcommand(subcommand =>
            subcommand
                .setName('modifier')
                .setDescription('Modifie un événement programmé existant.')
        )
        // Sous-commande pour supprimer un événement
        .addSubcommand(subcommand =>
            subcommand
                .setName('supprimer')
                .setDescription('Supprime un événement programmé.')
        )
        // Sous-commande pour lister les événements
        .addSubcommand(subcommand =>
            subcommand
                .setName('lister')
                .setDescription('Liste tous les événements actifs et programmés.')
        ),

    async execute(interaction, client, config) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.', ephemeral: true });
        }

        // Vérification des permissions
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({ content: 'Vous n\'avez pas la permission de gérer les événements.', ephemeral: true });
        }

        const subCommand = interaction.options.getSubcommand();

        await interaction.deferReply({ ephemeral: true });

        const editableEvents = await ScheduledEvent.getEditableEvents(); // Récupère les événements 'scheduled' ou 'active'

        if (subCommand === 'lister') {
            if (editableEvents.length === 0) {
                return interaction.editReply({ content: 'Il n\'y a aucun événement actif ou programmé à afficher pour le moment.', ephemeral: true });
            }

            const listEmbed = new EmbedBuilder()
                .setColor(Colors.Green)
                .setTitle('Liste des événements actifs et programmés')
                .setDescription('Voici les événements actuellement gérés par le bot :');

            let eventsList = '';
            editableEvents.forEach((event, index) => {
                const scheduledTime = moment(event.scheduled_for).format('DD/MM/YYYY à HH:mm');
                const status = event.status === 'scheduled' ? 'Programmé' : 'Actif';
                eventsList += `**${index + 1}. ${event.name}**\n`
                            + `   Status: ${status}\n`
                            + `   Date: ${scheduledTime} (<t:${Math.floor(event.scheduled_for.getTime() / 1000)}:R>)\n`
                            + `   Créé par: ${event.created_by_tag}\n`
                            + `   Participants: ${event.participants.length}\n\n`;
            });

            if (eventsList.length > 4096) {
                eventsList = eventsList.substring(0, 4000) + '...\n(Liste tronquée)';
            }

            listEmbed.setDescription(eventsList);
            await interaction.editReply({ embeds: [listEmbed], ephemeral: true });

        } else if (subCommand === 'modifier' || subCommand === 'supprimer') {
            if (editableEvents.length === 0) {
                return interaction.editReply({ content: 'Il n\'y a aucun événement actif ou programmé pour cette action.', ephemeral: true });
            }

            const selectOptions = editableEvents.map(event => {
                let statusEmoji = '';
                if (event.status === 'scheduled') statusEmoji = '🗓️';
                else if (event.status === 'active') statusEmoji = '🚨';

                return new StringSelectMenuOptionBuilder()
                    .setLabel(`${statusEmoji} ${event.name} (${moment(event.scheduled_for).format('DD/MM HH:mm')})`)
                    .setValue(event._id.toString());
            });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`select_event_to_${subCommand === 'modifier' ? 'edit' : 'delete'}`)
                .setPlaceholder(`Choisissez un événement à ${subCommand === 'modifier' ? 'modifier' : 'supprimer'}...`)
                .addOptions(selectOptions);

            const actionRow = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.editReply({
                content: `Quel événement souhaitez-vous ${subCommand === 'modifier' ? 'modifier' : 'supprimer'} ?`,
                components: [actionRow],
                ephemeral: true
            });
        }
    },
};