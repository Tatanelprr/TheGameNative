# 🎴 The Game — Multijoueur Mobile

Implémentation mobile du jeu de cartes coopératif **The Game** de Steffen Benndorf.
Développé avec **React Native / Expo** (client) et **Node.js / Socket.io** (serveur).

---

## 📱 Stack technique

| Côté | Technologie |
|------|-------------|
| Client | React Native, Expo SDK 54, Socket.io-client |
| Serveur | Node.js, Express, Socket.io |
| Navigation | React Navigation v7 |

---

## 🚀 Installation

### Prérequis
- Node.js v18+
- Expo Go (SDK 54) sur ton téléphone
- Téléphones sur le même réseau Wi-Fi que le PC

### 1. Lancer le serveur

    cd server
    npm install
    npm run dev

### 2. Configurer l'IP du serveur

Dans `client/utils/socket.js`, remplace l'IP par celle de ton PC :

    ipconfig  # Windows

    const SERVER_URL = 'http://TON_IP_LOCALE:3000';

### 3. Lancer le client

    cd client
    npm install
    npx expo start

Scanne le QR code avec **Expo Go** 📱

---

## 🎮 Comment jouer

### Règles
- 98 cartes numérotées de 2 à 99 à éliminer ensemble
- 2 piles **montantes** (commencent à 1)
- 2 piles **descendantes** (commencent à 100)
- **Règle du recul** : on peut reculer de exactement 10 sur n'importe quelle pile
- Jouer **minimum 2 cartes** par tour (1 quand la pioche est vide)

### Nombre de cartes par joueur

| Joueurs | Cartes |
|---------|--------|
| 1 | 8 |
| 2 | 7 |
| 3-5 | 6 |

### Déroulement d'un tour
1. 👆 Sélectionne une carte dans ta main
2. 👆 Appuie sur une pile pour prévisualiser
3. ✓ **Confirme** pour jouer la carte
4. ✕ **Annule** pour changer d'avis
5. Répète jusqu'à avoir joué le minimum requis
6. Appuie sur **Fin du tour**

---

## 🏗️ Structure du projet

    the-game/
    ├── client/                         # App React Native / Expo
    │   ├── screens/
    │   │   ├── HomeScreen.js           # Créer / rejoindre une partie
    │   │   ├── LobbyScreen.js          # Salle d'attente
    │   │   ├── GameScreen.js           # Jeu principal
    │   │   └── ResultScreen.js         # Victoire / Défaite
    │   ├── utils/
    │   │   └── socket.js               # Connexion Socket.io
    │   └── App.js                      # Navigation
    └── server/                         # Serveur Node.js
        ├── game/
        │   └── GameManager.js          # Logique complète du jeu
        └── index.js                    # Serveur Express + Socket.io

---

## 🔌 Événements Socket.io

| Événement | Direction | Description |
|-----------|-----------|-------------|
| `createGame` | Client → Serveur | Créer une partie |
| `joinGame` | Client → Serveur | Rejoindre avec un code |
| `startGame` | Client → Serveur | Lancer la partie (hôte) |
| `playCard` | Client → Serveur | Jouer une carte |
| `endTurn` | Client → Serveur | Terminer son tour |
| `gameStarted` | Serveur → Client | La partie commence |
| `gameUpdated` | Serveur → Client | État du jeu mis à jour |
| `playerJoined` | Serveur → Client | Nouveau joueur dans le lobby |
| `playerDisconnected` | Serveur → Client | Joueur déconnecté |

---

## 👨‍💻 Développé par

**Ethan** — 2026