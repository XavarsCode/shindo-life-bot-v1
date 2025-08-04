// Fonction pour maintenir le bot en vie sur Replit
function keepAlive() {
    setInterval(() => {
        console.log('🤖 Bot toujours actif...');
    }, 5 * 60 * 1000); // Toutes les 5 minutes
}

module.exports = { keepAlive };