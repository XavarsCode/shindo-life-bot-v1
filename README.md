# Shindo Life RP Bot v1

[![Discord.js](https://img.shields.io/badge/Discord.js-v14-blue.svg?style=for-the-badge&logo=discord)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

## 📝 Description du Projet

Le **Shindo Life RP Bot** est un bot Discord polyvalent conçu spécifiquement pour la gestion et l'amélioration de l'expérience sur les serveurs de rôle-play (RP) dédiés à Shindo Life ou à des jeux similaires. Il offre une gamme de fonctionnalités allant de la modération à la gestion d'événements, en passant par des outils utilitaires pour les joueurs et les administrateurs.

## ✨ Fonctionnalités Clés

* **Gestion des Commandes Slash** : Toutes les commandes sont implémentées en tant que commandes slash pour une meilleure intégration et facilité d'utilisation.
* **Système de Modération et Gestion RP** :
    * `/tempban` & `/unban` : Bannissement temporaire et débannissement des utilisateurs.
    * `/whitelist` : Gestion d'une liste blanche d'utilisateurs.
    * `/rpfollowup` (commande contextuelle) : Permet de suivre et valider les entrées RP.
    * `/suivis` : Affiche les suivis RP en attente ou archivés.
* **Statut et Informations du Serveur/Jeu** :
    * `/maintenance` : Activation/désactivation du statut de maintenance du serveur.
    * `/statut` : Affiche le statut actuel du serveur.
    * `/joueurs` : Affiche la liste des joueurs connectés (nécessite une intégration API de jeu).
    * `/info` : Informations sur le bot (`/info bot`) et le serveur Discord (`/info server`).
* **Outils Utilitaires** :
    * `/rappel` : Définit des rappels personnalisés pour les utilisateurs.
    * `/spin` : Fait tourner une "roue" avec des choix personnalisables.
    * `/renommer` : Renomme les membres sans rôle spécifique en "Nouveau Joueur" (personnalisable).
    * `/poll` : Crée des sondages.
* **Gestion Avancée des Événements et Salons** :
    * **`/event` (Commande principale des événements)** :
        * **`/event creer <nom> <description> <duree> <type> [salon_vocal_perso]`** : Crée et annonce immédiatement un événement.
        * **`/event programmer <nom> <heures> [minutes] [description] [duree] [type] [salon_vocal_perso]`** : Programme un événement pour une date et une heure futures. Les utilisateurs peuvent s'inscrire en réagissant à l'annonce. L'annonce est mise à jour dynamiquement avec la liste des participants (mentions Discord).
        * **`/event stop`** : Affiche un sélecteur interactif pour choisir et clôturer un événement programmé ou actif. Une fois clôturé, un récapitulatif final des participants est affiché dans le salon d'annonce, et l'annonce initiale est supprimée.
    * **`/event-commands` (Commandes d'administration des événements)** :
        * **`/event-commands lister`** : Liste tous les événements actifs et programmés avec leurs détails.
        * **`/event-commands modifier`** : Affiche un sélecteur pour choisir un événement et le modifier via un formulaire (nom, description, date/heure, durée, salon vocal).
        * **`/event-commands supprimer`** : Affiche un sélecteur pour choisir un événement à supprimer. Nécessite une confirmation. L'annonce est également supprimée.
    * **`/ouvrir` & `/fermer`** : Ouvre ou ferme des salons spécifiques.
    * **`/queue`** : Gère une file d'attente (pour les raids, etc.).
* **Statistiques et Configuration** :
    * `/stats` : Affiche diverses statistiques (personnalisable).
    * `/config` : Gère les paramètres de configuration du bot via des commandes.
* **Persistance des données** : Utilise MongoDB via Mongoose pour stocker les informations importantes (bans temporaires, whitelist, statuts, suivis RP, événements programmés, participants, etc.).

## 🚀 Démarrage Rapide

Suivez ces étapes pour configurer et lancer le bot sur votre serveur Discord.

### Prérequis

* [Node.js](https://nodejs.org/) (version 16.9.0 ou supérieure, **recommandé 20+**)
* [npm](https://www.npmjs.com/) (généralement inclus avec Node.js)
* Un compte Discord et un [bot créé sur le Portail Développeur Discord](https://discord.com/developers/applications)
* Une base de données [MongoDB](https://www.mongodb.com/) (locale ou en ligne comme MongoDB Atlas)

### Configuration du Bot Discord

1.  **Créez une nouvelle application** sur le [Portail Développeur Discord](https://discord.com/developers/applications).
2.  Dans l'onglet **"Bot"** de votre application :
    * Cliquez sur **"Add Bot"** et confirmez.
    * Sous "Privileged Gateway Intents", activez les trois options :
        * `PRESENCE_INTENT`
        * `GUILD_MEMBERS_INTENT`
        * `MESSAGE_CONTENT_INTENT`
    * Copiez le **Token de votre bot**.
3.  Dans l'onglet **"OAuth2" -> "URL Generator"** :
    * Sélectionnez l'étendue `bot` et `applications.commands`.
    * Pour les permissions du bot, sélectionnez au minimum : `Send Messages`, `Embed Links`, `Read Message History`, `Add Reactions`, `Manage Channels`, `Manage Guild` (pour les commandes admin comme `/event` et `/event-commands`).
    * Copiez le lien généré et collez-le dans votre navigateur pour inviter le bot sur votre serveur.

### Installation

1.  **Cloner le dépôt :**
    ```bash
    git clone [https://github.com/XavarsCode/shindo-life-bot-v1.git](https://github.com/XavarsCode/shindo-life-bot-v1.git)
    cd shindo-life-bot-v1
    ```

2.  **Installer les dépendances :**
    ```bash
    npm install
    ```
    Cela installera toutes les librairies nécessaires, y compris `discord.js`, `mongoose`, `moment`, etc.

### Configuration des Variables d'Environnement

Le bot utilise des variables d'environnement (secrets) pour stocker les informations sensibles et la configuration. Il est **FORTEMENT RECOMMANDÉ** de ne PAS les coder en dur dans le code.

Si vous utilisez **Replit**, utilisez la section "Secrets" (l'icône en forme de cadenas).
Si vous lancez localement, créez un fichier `.env` à la racine de votre projet (n'oubliez pas de l'ajouter à votre `.gitignore`).

Exemple de `.env` (ou secrets Replit) :

```dotenv
TOKEN=VOTRE_TOKEN_BOT_DISCORD
CLIENT_ID=ID_DE_VOTRE_APPLICATION_BOT
GUILD_ID=ID_DE_VOTRE_SERVEUR_PRINCIPAL_POUR_LE_DEPLOIEMENT # ID du serveur où les commandes slash seront déployées instantanément (en mode dev).
MONGO_URI=VOTRE_URL_DE_CONNEXION_MONGODB # Ex: mongodb://localhost:27017/mybotdb ou une URI Atlas (format: mongodb+srv://user:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority)

# IDs Discord optionnels pour la configuration du bot (à récupérer en activant le Mode Développeur sur Discord)
# NÉCESSAIRE pour les fonctionnalités d'événements et de gestion
EVENT_ANNOUNCE_CHANNEL_ID=1401850589708681317 # ID du salon où les annonces d'événements seront envoyées
PARTICIPATION_EMOJI=✅ # L'emoji que les utilisateurs utiliseront pour s'inscrire aux événements programmés
