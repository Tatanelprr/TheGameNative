// server/index.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const GameManager = require('./game/GameManager');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Nettoyage des parties inactives toutes les 30 minutes
setInterval(() => GameManager.cleanupGames(), 30 * 60 * 1000);

// Route de santé pour vérifier que le serveur tourne
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'The Game Server is running 🎴' });
});

io.on('connection', (socket) => {
  console.log(`✅ Joueur connecté : ${socket.id}`);

  // ─── CRÉER UNE PARTIE ───────────────────────────────────────────
  socket.on('createGame', ({ playerName }, callback) => {
    try {
      const game = GameManager.createGame(socket.id, playerName);
      socket.join(game.code);
      console.log(`🎮 Partie créée : ${game.code} par ${playerName}`);
      callback({ success: true, game: sanitizeGame(game, socket.id) });
    } catch (err) {
      callback({ success: false, error: err.message });
    }
  });

  // ─── REJOINDRE UNE PARTIE ───────────────────────────────────────
  socket.on('joinGame', ({ code, playerName }, callback) => {
    try {
      const result = GameManager.joinGame(code.toUpperCase(), socket.id, playerName);
      if (result.error) return callback({ success: false, error: result.error });

      socket.join(code.toUpperCase());
      console.log(`👤 ${playerName} a rejoint la partie ${code}`);

      // Notifier les autres joueurs
      socket.to(code.toUpperCase()).emit('playerJoined', {
        game: sanitizeGame(result, socket.id),
      });

      callback({ success: true, game: sanitizeGame(result, socket.id) });
    } catch (err) {
      callback({ success: false, error: err.message });
    }
  });

  // ─── LANCER LA PARTIE ───────────────────────────────────────────
  socket.on('startGame', ({ code }, callback) => {
    try {
      const result = GameManager.startGame(code, socket.id);
      if (result.error) return callback({ success: false, error: result.error });

      console.log(`🚀 Partie ${code} lancée avec ${result.players.length} joueurs`);

      // Envoyer à chaque joueur son propre état (avec sa main)
      result.players.forEach((player) => {
        io.to(player.id).emit('gameStarted', {
          game: sanitizeGame(result, player.id),
        });
      });

      callback({ success: true });
    } catch (err) {
      callback({ success: false, error: err.message });
    }
  });

  // ─── JOUER UNE CARTE ────────────────────────────────────────────
  socket.on('playCard', ({ code, cardValue, pileKey }, callback) => {
    try {
      const result = GameManager.playCard(code, socket.id, cardValue, pileKey);
      if (result.error) return callback({ success: false, error: result.error });

      const { game, event } = result;

      // Envoyer l'état mis à jour à chaque joueur
      game.players.forEach((player) => {
        io.to(player.id).emit('gameUpdated', {
          game: sanitizeGame(game, player.id),
          event,
        });
      });

      callback({ success: true });
    } catch (err) {
      callback({ success: false, error: err.message });
    }
  });

  // ─── FIN DE TOUR ────────────────────────────────────────────────
  socket.on('endTurn', ({ code }, callback) => {
    try {
      const result = GameManager.endTurn(code, socket.id);
      if (result.error) return callback({ success: false, error: result.error });

      const { game, event } = result;

      game.players.forEach((player) => {
        io.to(player.id).emit('gameUpdated', {
          game: sanitizeGame(game, player.id),
          event,
        });
      });

      callback({ success: true });
    } catch (err) {
      callback({ success: false, error: err.message });
    }
  });

  // ─── DÉCONNEXION ────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`❌ Joueur déconnecté : ${socket.id}`);
    const result = GameManager.disconnectPlayer(socket.id);
    if (result) {
      const { game, code } = result;
      io.to(code).emit('playerDisconnected', {
        game: sanitizeGame(game, null),
      });
    }
  });
});

// ─── SANITIZE ─────────────────────────────────────────────────────
// Cache la main des autres joueurs
function sanitizeGame(game, requesterId) {
  return {
    ...game,
    deck: game.deck ? { remaining: game.deck.length } : { remaining: 0 },
    players: game.players.map((player) => ({
      id: player.id,
      name: player.name,
      isHost: player.isHost,
      isConnected: player.isConnected,
      cardCount: player.hand.length,
      // La main complète uniquement pour le joueur lui-même
      hand: player.id === requesterId ? player.hand : [],
    })),
  };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎴 The Game Server démarré sur le port ${PORT}`);
});