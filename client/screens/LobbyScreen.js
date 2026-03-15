// client/screens/LobbyScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Share,
} from 'react-native';
import socket from '../utils/socket';

export default function LobbyScreen({ navigation, route }) {
  const { game: initialGame, playerId, playerName } = route.params;
  const [game, setGame] = useState(initialGame);

  const isHost = game.players.find(p => p.id === playerId)?.isHost;

  useEffect(() => {
    // Un nouveau joueur a rejoint
    socket.on('playerJoined', ({ game: updatedGame }) => {
      setGame(updatedGame);
    });

    // Un joueur s'est déconnecté
    socket.on('playerDisconnected', ({ game: updatedGame }) => {
      setGame(updatedGame);
    });

    // La partie démarre
    socket.on('gameStarted', ({ game: updatedGame }) => {
      navigation.replace('Game', {
        game: updatedGame,
        playerId: socket.id,
        playerName,
      });
    });

    return () => {
      socket.off('playerJoined');
      socket.off('playerDisconnected');
      socket.off('gameStarted');
    };
  }, []);

  const handleStartGame = () => {
    if (game.players.length < 1) {
      return Alert.alert('Erreur', 'Il faut au moins 1 joueur');
    }
    socket.emit('startGame', { code: game.code }, (response) => {
      if (!response.success) {
        Alert.alert('Erreur', response.error);
      }
    });
  };

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Rejoins ma partie de The Game ! Code : ${game.code}`,
      });
    } catch (err) {
      console.log(err);
    }
  };

  const renderPlayer = ({ item, index }) => (
    <View style={styles.playerRow}>
      <View style={styles.playerAvatar}>
        <Text style={styles.playerAvatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{item.name}</Text>
        {item.isHost && <Text style={styles.hostBadge}>HÔTE</Text>}
      </View>
      <View style={[
        styles.connectionDot,
        { backgroundColor: item.isConnected ? '#4CAF50' : '#f44336' }
      ]} />
    </View>
  );

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>CODE DE LA PARTIE</Text>
        <TouchableOpacity onPress={handleShareCode}>
          <Text style={styles.gameCode}>{game.code}</Text>
          <Text style={styles.shareHint}>Appuie pour partager 📤</Text>
        </TouchableOpacity>
      </View>

      {/* JOUEURS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          JOUEURS — {game.players.length}/5
        </Text>
        <FlatList
          data={game.players}
          keyExtractor={(item) => item.id}
          renderItem={renderPlayer}
          scrollEnabled={false}
        />
      </View>

      {/* INFO */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>🎴 98 cartes à éliminer ensemble</Text>
        <Text style={styles.infoText}>⬆️ 2 piles montantes · ⬇️ 2 piles descendantes</Text>
        <Text style={styles.infoText}>🔄 Recul de 10 autorisé sur chaque pile</Text>
        <Text style={styles.infoText}>
          🃏 {game.players.length <= 2 ? game.players.length === 1 ? '8' : '7' : '6'} cartes par joueur
        </Text>
      </View>

      {/* BOUTON DÉMARRER */}
      {isHost ? (
        <TouchableOpacity
          style={[
            styles.btnStart,
            game.players.length < 1 && styles.btnDisabled,
          ]}
          onPress={handleStartGame}
        >
          <Text style={styles.btnStartText}>
            🚀 Lancer la partie ({game.players.length} joueur{game.players.length > 1 ? 's' : ''})
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.waitingBox}>
          <Text style={styles.waitingText}>
            ⏳ En attente que l'hôte lance la partie…
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    padding: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerLabel: {
    color: '#555',
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 12,
  },
  gameCode: {
    fontSize: 56,
    fontWeight: '900',
    color: '#E8C547',
    letterSpacing: 12,
    textAlign: 'center',
  },
  shareHint: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#555',
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 16,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161f',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8C547',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  playerAvatarText: {
    color: '#0a0a0f',
    fontWeight: '900',
    fontSize: 18,
  },
  playerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hostBadge: {
    backgroundColor: '#E8C54720',
    color: '#E8C547',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  infoBox: {
    backgroundColor: '#16161f',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    marginBottom: 24,
  },
  infoText: {
    color: '#666',
    fontSize: 13,
    lineHeight: 20,
  },
  btnStart: {
    backgroundColor: '#E8C547',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnStartText: {
    color: '#0a0a0f',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1,
  },
  waitingBox: {
    backgroundColor: '#16161f',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  waitingText: {
    color: '#666',
    fontSize: 14,
  },
});