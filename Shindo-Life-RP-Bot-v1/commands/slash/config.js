// commands/slash/config.js
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configure le bot (nécessite les permissions d\'administrateur).')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption(option =>
            option.setName('option')
                .setDescription('L\'option à configurer.')
                .setRequired(true)
                .addChoices(
                    { name: 'Salon des annonces d\'événement (ID)', value: 'eventAnnounceChannelId' },
                    { name: 'Salon de validation RP (ID)', value: 'rpValidationChannelId' },
                    { name: 'Salon des suivis RP validés (ID)', value: 'rpApprovedChannelId' },
                    { name: 'Rôle Staff (ID)', value: 'roleId' },
                    { name: 'Salon Statut Serveur (ID)', value: 'channelId' } // Ajouté le channelId
                ))
        .addStringOption(option =>
            option.setName('valeur')
                .setDescription('La nouvelle valeur de l\'option (un ID de salon ou de rôle).')
                .setRequired(true)),

    async execute(interaction, client, config) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.', ephemeral: true });
        }

        const option = interaction.options.getString('option');
        const valeur = interaction.options.getString('valeur');

        // Vérification basique pour s'assurer que la valeur ressemble à un ID (chiffres uniquement)
        if (!/^\d+$/.test(valeur)) {
            return interaction.reply({ content: '❌ La valeur fournie ne semble pas être un ID valide (doit être numérique).', ephemeral: true });
        }

        // Mettre à jour l'objet config en mémoire
        config[option] = valeur;

        // Écrire la nouvelle configuration dans le fichier de configuration (si vous utilisez un fichier)
        // Note: Si vous utilisez des variables d'environnement (process.env), cette partie est plus complexe.
        // Pour Replit secrets (process.env), la modification doit être faite manuellement dans les secrets.
        // Cette partie est pour un fichier config.json standard.

        try {
            // Tentative de lecture/écriture d'un fichier config.json à la racine du projet.
            // Si vous utilisez process.env sur Replit, cette partie est seulement indicative.
            const configFilePath = path.resolve(__dirname, '../../config.json'); // Remonte de commands/slash/ vers la racine

            let currentConfig = {};
            if (fs.existsSync(configFilePath)) {
                currentConfig = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
            }

            currentConfig[option] = valeur;
            fs.writeFileSync(configFilePath, JSON.stringify(currentConfig, null, 2), 'utf8');

            const embed = new EmbedBuilder()
                .setTitle('✅ Configuration Mise à Jour')
                .setDescription(`L'option \`${option}\` a été mise à jour avec la valeur \`${valeur}\`.`)
                .setColor('#00FF00')
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la configuration:', error);
            await interaction.reply({ content: '❌ Une erreur est survenue lors de la mise à jour de la configuration. Assurez-vous que le fichier `config.json` existe et est accessible en écriture, ou que vous utilisez les secrets Replit correctement (dans ce cas, la modification doit être manuelle pour les secrets).', ephemeral: true });
        }
    },
};