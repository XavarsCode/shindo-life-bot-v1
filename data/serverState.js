// État global du serveur
const serverStatus = {
    isOpen: false,
    playerCount: 0,
    maxPlayers: 70,
    serverCode: null, // Code du serveur privé
    eventActive: false,
    eventName: '',
    queue: [], // File d'attente
    bannedUsers: new Set(), // Utilisateurs bannis temporairement
    whitelist: new Set(), // Liste blanche
    whitelistOnly: false, // Mode whitelist uniquement
    maintenanceMode: false,
    scheduledEvents: [], // Événements programmés
    serverStats: {
        totalSessions: 0,
        totalPlaytime: 0,
        lastOpened: null
    }
};

// Données du jeu Shindo Life
const gameData = {
    clans: [
        'Uchiha', 'Hyuga', 'Senju', 'Uzumaki', 'Nara', 'Akimichi', 'Yamanaka', 'Aburame', 
        'Inuzuka', 'Lee', 'Hatake', 'Sarutobi', 'Shimura', 'Kamaki', 'Sabaku', 'Kaguya',
        'Hozuki', 'Yuki', 'Kurama', 'Akuma', 'Shizen', 'Kagoku', 'Doku', 'Seishin'
    ],
    elements: [
        'Feu', 'Eau', 'Terre', 'Vent', 'Foudre', 'Glace', 'Bois', 'Lave', 'Tempête',
        'Vapeur', 'Explosion', 'Particules', 'Magnet', 'Poison', 'Acier', 'Cristal'
    ],
    villages: [
        'Konoha (Village Caché des Feuilles)', 'Suna (Village Caché du Sable)', 
        'Kiri (Village Caché de la Brume)', 'Kumo (Village Caché des Nuages)', 
        'Iwa (Village Caché des Rochers)', 'Ame (Village Caché de la Pluie)',
        'Taki (Village Caché de la Cascade)', 'Kusa (Village Caché de l\'Herbe)'
    ],
    bijuu: [
        'Shukaku (1 Queue)', 'Matatabi (2 Queues)', 'Isobu (3 Queues)', 'Son Goku (4 Queues)',
        'Kokuo (5 Queues)', 'Saiken (6 Queues)', 'Chomei (7 Queues)', 'Gyuki (8 Queues)', 'Kurama (9 Queues)'
    ]
};

module.exports = { serverStatus, gameData };