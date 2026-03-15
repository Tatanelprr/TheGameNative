// client/screens/ResultScreen.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import socket from '../utils/socket';

export default function ResultScreen({ navigation, route }) {
  const { result, game, remainingCards } = route.params;
  const isVictory = result === 'victory';

  const handlePlayAgain = () => {
    socket.disconnect();
    navigation.replace('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* EMOJI */}
        <Text style={styles.emoji}>{isVictory ? '🏆' : '💀'}</Text>

        {/* TITRE */}
        <Text style={[styles.title, isVictory ? styles.titleVictory : styles.titleDefeat]}>
          {isVictory ? 'VICTOIRE !' : 'DÉFAITE'}
        </Text>

        {/* SOUS-TITRE */}
        <Text style={styles.subtitle}>
          {isVictory
            ? 'Incroyable ! Vous avez éliminé toutes les cartes !'
            : `Il restait ${remainingCards} carte${remainingCards > 1 ? 's' : ''} à jouer…`}
        </Text>

        {/* STATS */}
        <View style={styles.statsBox}>
          <Text style={styles.statsTitle}>JOUEURS</Text>
          {game.players.map((player) => (
            <View key={player.id} style={styles.statsRow}>
              <View style={styles.statsAvatar}>
                <Text style={styles.statsAvatarText}>
                  {player.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.statsName}>{player.name}</Text>
              {!isVictory && (
                <Text style={styles.statsCards}>
                  {player.cardCount} carte{player.cardCount > 1 ? 's' : ''}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* PILES FINALES */}
        <View style={styles.pilesBox}>
          <Text style={styles.statsTitle}>PILES FINALES</Text>
          <View style={styles.pilesRow}>
            {Object.entries(game.piles).map(([key, pile]) => (
              <View key={key} style={styles.pileItem}>
                <Text style={styles.pileIcon}>
                  {key.startsWith('asc') ? '⬆️' : '⬇️'}
                </Text>
                <Text style={styles.pileValue}>
                  {pile[pile.length - 1]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* BOUTON REJOUER */}
        <TouchableOpacity style={styles.btnReplay} onPress={handlePlayAgain}>
          <Text style={styles.btnReplayText}>🔄 Rejouer</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 20,
  },
  emoji: {
    fontSize: 80,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 4,
  },
  titleVictory: {
    color: '#E8C547',
  },
  titleDefeat: {
    color: '#f44336',
  },
  subtitle: {
    color: '#666',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  statsBox: {
    backgroundColor: '#16161f',
    borderRadius: 14,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    gap: 10,
  },
  statsTitle: {
    color: '#555',
    fontSize: 10,
    letterSpacing: 3,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statsAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8C547',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsAvatarText: {
    color: '#0a0a0f',
    fontWeight: '900',
    fontSize: 14,
  },
  statsName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  statsCards: {
    color: '#f44336',
    fontSize: 13,
    fontWeight: '600',
  },
  pilesBox: {
    backgroundColor: '#16161f',
    borderRadius: 14,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    gap: 12,
  },
  pilesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  pileItem: {
    alignItems: 'center',
    gap: 4,
  },
  pileIcon: {
    fontSize: 20,
  },
  pileValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  btnReplay: {
    backgroundColor: '#E8C547',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '100%',
  },
  btnReplayText: {
    color: '#0a0a0f',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1,
  },
});