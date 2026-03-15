// server/game/GameManager.js

class GameManager {
  constructor() {
    this.games = {};
  }

  // Générer un code de partie à 4 lettres
  generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    // S'assurer que le code est unique
    if (this.games[code]) return this.generateCode();
    return code;
  }

  // Créer une nouvelle partie
  createGame(hostId, hostName) {
    const code = this.generateCode();
    this.games[code] = {
      code,
      hostId,
      status: 'lobby', // lobby | playing | finished
      players: [
        {
          id: hostId,
          name: hostName,
          hand: [],
          isHost: true,
          isConnected: true,
        },
      ],
      piles: {
        asc1: [1],   // Monte depuis 1
        asc2: [1],   // Monte depuis 1
        desc1: [100], // Descend depuis 100
        desc2: [100], // Descend depuis 100
      },
      deck: [],
      currentPlayerIndex: 0,
      cardsPlayedThisTurn: 0,
      minCardsPerTurn: 2, // Devient 1 quand le deck est vide
      lastActivity: Date.now(),
    };
    return this.games[code];
  }

  // Rejoindre une partie existante
  joinGame(code, playerId, playerName) {
    const game = this.games[code];
    if (!game) return { error: 'Partie introuvable' };
    if (game.status !== 'lobby') return { error: 'La partie a déjà commencé' };
    if (game.players.length >= 5) return { error: 'La partie est complète (5 joueurs max)' };

    // Vérifier si le joueur est déjà dans la partie (reconnexion)
    const existing = game.players.find(p => p.id === playerId);
    if (existing) {
      existing.isConnected = true;
      return game;
    }

    game.players.push({
      id: playerId,
      name: playerName,
      hand: [],
      isHost: false,
      isConnected: true,
    });

    return game;
  }

  // Générer et mélanger le deck
  generateDeck() {
    const deck = [];
    for (let i = 2; i <= 99; i++) deck.push(i);
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  // Distribuer les cartes selon le nombre de joueurs
  getHandSize(playerCount) {
    if (playerCount === 1) return 8;
    if (playerCount === 2) return 7;
    return 6; // 3, 4, 5 joueurs
  }

  // Lancer la partie
  startGame(code, requesterId) {
    const game = this.games[code];
    if (!game) return { error: 'Partie introuvable' };
    if (game.hostId !== requesterId) return { error: 'Seul le créateur peut lancer la partie' };
    if (game.players.length < 1) return { error: 'Pas assez de joueurs' };

    // Générer le deck
    game.deck = this.generateDeck();
    const handSize = this.getHandSize(game.players.length);

    // Distribuer les cartes
    game.players.forEach(player => {
      player.hand = game.deck.splice(0, handSize);
    });

    game.status = 'playing';
    game.currentPlayerIndex = 0;
    game.cardsPlayedThisTurn = 0;
    game.minCardsPerTurn = 2;

    return game;
  }

  // Vérifier si une carte peut être jouée sur une pile
  canPlayCard(game, pileKey, cardValue) {
    const pileTop = game.piles[pileKey][game.piles[pileKey].length - 1];
    const isAscending = pileKey.startsWith('asc');

    if (isAscending) {
      // Doit être plus grand OU exactement 10 de moins (règle du recul)
      return cardValue > pileTop || cardValue === pileTop - 10;
    } else {
      // Doit être plus petit OU exactement 10 de plus (règle du recul)
      return cardValue < pileTop || cardValue === pileTop + 10;
    }
  }

  // Jouer une carte
  playCard(code, playerId, cardValue, pileKey) {
    const game = this.games[code];
    if (!game) return { error: 'Partie introuvable' };
    if (game.status !== 'playing') return { error: 'La partie n\'est pas en cours' };

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return { error: 'Ce n\'est pas ton tour' };

    // Vérifier que le joueur a la carte
    const cardIndex = currentPlayer.hand.indexOf(cardValue);
    if (cardIndex === -1) return { error: 'Tu n\'as pas cette carte' };

    // Vérifier que la carte peut être jouée sur cette pile
    if (!this.canPlayCard(game, pileKey, cardValue)) {
      return { error: 'Cette carte ne peut pas être jouée ici' };
    }

    // Jouer la carte
    currentPlayer.hand.splice(cardIndex, 1);
    game.piles[pileKey].push(cardValue);
    game.cardsPlayedThisTurn++;

    // Mettre à jour le minimum si le deck est vide
    if (game.deck.length === 0) {
      game.minCardsPerTurn = 1;
    }

    // Vérifier la victoire
    const allHandsEmpty = game.players.every(p => p.hand.length === 0);
    if (allHandsEmpty && game.deck.length === 0) {
      game.status = 'finished';
      game.result = 'victory';
      return { game, event: 'victory' };
    }

    return { game, event: 'cardPlayed' };
  }

  // Piocher des cartes en fin de tour
  drawCards(game, player) {
    const handSize = this.getHandSize(game.players.length);
    const cardsToDraw = Math.min(
      handSize - player.hand.length,
      game.deck.length
    );
    for (let i = 0; i < cardsToDraw; i++) {
      player.hand.push(game.deck.shift());
    }
  }

  // Fin de tour
  endTurn(code, playerId) {
    const game = this.games[code];
    if (!game) return { error: 'Partie introuvable' };

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return { error: 'Ce n\'est pas ton tour' };

    // Vérifier le minimum de cartes jouées
    if (game.cardsPlayedThisTurn < game.minCardsPerTurn) {
      return {
        error: `Tu dois jouer au moins ${game.minCardsPerTurn} carte(s) avant de passer`,
      };
    }

    // Piocher
    this.drawCards(game, currentPlayer);

    // Vérifier la défaite : le joueur actuel ne peut plus jouer
    const nextIndex = (game.currentPlayerIndex + 1) % game.players.length;
    game.currentPlayerIndex = nextIndex;
    game.cardsPlayedThisTurn = 0;

    // Vérifier si la partie est perdue (aucun joueur ne peut jouer)
    if (this.isGameLost(game)) {
      game.status = 'finished';
      game.result = 'defeat';
      // Compter les cartes restantes
      const remainingCards =
        game.deck.length +
        game.players.reduce((sum, p) => sum + p.hand.length, 0);
      game.remainingCards = remainingCards;
      return { game, event: 'defeat' };
    }

    return { game, event: 'turnChanged' };
  }

  // Vérifier si la partie est perdue
  isGameLost(game) {
    const nextPlayer = game.players[game.currentPlayerIndex];
    if (!nextPlayer || nextPlayer.hand.length === 0) return false;

    // Vérifier si le joueur peut jouer au moins minCardsPerTurn cartes
    let playableCount = 0;
    for (const card of nextPlayer.hand) {
      for (const pileKey of Object.keys(game.piles)) {
        if (this.canPlayCard(game, pileKey, card)) {
          playableCount++;
          break;
        }
      }
      if (playableCount >= game.minCardsPerTurn) return false;
    }

    return playableCount < game.minCardsPerTurn;
  }

  // Déconnexion d'un joueur
  disconnectPlayer(playerId) {
    for (const code of Object.keys(this.games)) {
      const game = this.games[code];
      const player = game.players.find(p => p.id === playerId);
      if (player) {
        player.isConnected = false;
        return { game, code };
      }
    }
    return null;
  }

  // Nettoyer les parties inactives (> 2h)
  cleanupGames() {
    const now = Date.now();
    for (const code of Object.keys(this.games)) {
      if (now - this.games[code].lastActivity > 2 * 60 * 60 * 1000) {
        delete this.games[code];
      }
    }
  }

  getGame(code) {
    return this.games[code] || null;
  }
}

module.exports = new GameManager();