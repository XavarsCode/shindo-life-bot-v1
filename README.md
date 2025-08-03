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
* **Gestion des Événements et Salons** :
    * `/event` : Gère les annonces d'événements.
    * `/ouvrir` & `/fermer` : Ouvre ou ferme des salons spécifiques.
    * `/queue` : Gère une file d'attente (pour les raids, etc.).
* **Statistiques et Configuration** :
    * `/stats` : Affiche diverses statistiques (personnalisable).
    * `/config` : Gère les paramètres de configuration du bot via des commandes.
* **Persistance des données** : Utilise MongoDB via Mongoose pour stocker les informations importantes (bans temporaires, whitelist, statuts, suivis RP, etc.).

## 🚀 Démarrage Rapide

Suivez ces étapes pour configurer et lancer le bot sur votre serveur Discord.

### Prérequis

* [Node.js](https://nodejs.org/) (version 16.9.0 ou supérieure, recommandé 20+)
* [npm](https://www.npmjs.com/) (généralement inclus avec Node.js)
* Un compte Discord et un [bot créé sur le Portail Développeur Discord](https://discord.com/developers/applications)
* Une base de données [MongoDB](https://www.mongodb.com/) (locale ou en ligne comme MongoDB Atlas)

### Installation

1.  **Cloner le dépôt :**
    ```bash
    git clone [https://github.com/](https://github.com/)[VOTRE_NOM_UTILISATEUR]/Shindo-Life-RP-Bot.git
    cd Shindo-Life-RP-Bot
    ```

2.  **Installer les dépendances :**
    ```bash
    npm install
    ```
    Cela installera toutes les librairies nécessaires, y compris `discord.js`, `mongoose`, `ms` (si utilisé), etc.

### Configuration des Variables d'Environnement

Le bot utilise des variables d'environnement (secrets) pour stocker les informations sensibles et la configuration. Il est **FORTEMENT RECOMMANDÉ** de ne PAS les coder en dur dans le code.

Si vous utilisez **Replit**, utilisez la section "Secrets" (l'icône en forme de cadenas).
Si vous lancez localement, créez un fichier `.env` à la racine de votre projet (n'oubliez pas de l'ajouter à votre `.gitignore`).

Exemple de `.env` (ou secrets Replit) :

```dotenv
TOKEN=VOTRE_TOKEN_BOT_DISCORD
CLIENT_ID=ID_DE_VOTRE_APPLICATION_BOT
GUILD_ID=ID_DE_VOTRE_SERVEUR_PRINCIPAL_POUR_LE_DEPLOIEMENT
MONGO_URI=VOTRE_URL_DE_CONNEXION_MONGODB

# IDs optionnels pour la configuration du serveur (à récupérer sur Discord en Mode Développeur)
CHANNEL_ID=ID_DU_SALON_DE_STATUT_OU_ANNONCES
ROLE_ID=ID_DU_ROLE_STAFF_OU_ADMIN (si utilisé pour certaines permissions)
RP_VALIDATION_CHANNEL_ID=ID_DU_SALON_DE_VALIDATION_RP
RP_APPROVED_CHANNEL_ID=ID_DU_SALON_D_ARCHIVES_RP
