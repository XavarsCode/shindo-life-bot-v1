// api/auth/callback.js

const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Erreur: Aucun code d\'autorisation fourni.');
  }

  const data = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    client_secret: process.env.DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
    scope: 'identify guilds',
  });

  try {
    // Échanger le code contre un jeton d'accès
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: data,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Erreur lors de l\'échange du code:', tokenData.error_description);
      return res.status(400).send('Erreur d\'authentification. Veuillez réessayer.');
    }

    const { access_token } = tokenData;

    // Utiliser le jeton pour récupérer les informations de l'utilisateur
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        authorization: `Bearer ${access_token}`,
      },
    });
    
    const user = await userResponse.json();
    
    // TODO: Vous devez maintenant vérifier les rôles de l'utilisateur.
    // Cette partie est à implémenter. Pour l'instant, affichons juste l'utilisateur.
    
    // À ce stade, vous auriez le nom d'utilisateur et l'ID de l'utilisateur connecté.
    res.send(`Bonjour, ${user.username}! Vous êtes connecté.`);

  } catch (error) {
    console.error('Erreur du serveur:', error);
    res.status(500).send('Erreur interne du serveur.');
  }
};
