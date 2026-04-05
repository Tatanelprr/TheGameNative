// client/screens/GameScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import socket from '../utils/socket';

export default function GameScreen({ navigation, route }) {
  const { game: initialGame, playerId, playerName } = route.params;
  const [game, setGame] = useState(initialGame);
  const [selectedCard, setSelectedCard] = useState(null);
  const [pendingPlay, setPendingPlay] = useState(null);
  const [message, setMessage] = useState('');
  const messageAnim = useRef(new Animated.Value(0)).current;

  const myPlayer = game.players.find(p => p.id === playerId);
  const currentPlayer = game.players[game.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === playerId;

  useEffect(() => {
    socket.on('gameUpdated', ({ game: updatedGame, event }) => {
      setGame(updatedGame);
      setSelectedCard(null);
      setPendingPlay(null);

      if (event === 'victory') {
        navigation.replace('Result', { result: 'victory', game: updatedGame });
      } else if (event === 'defeat') {
        navigation.replace('Result', {
          result: 'defeat',
          game: updatedGame,
          remainingCards: updatedGame.remainingCards,
        });
      } else if (event === 'turnChanged') {
        const next = updatedGame.players[updatedGame.currentPlayerIndex];
        showMessage(next?.id === playerId ? '🎯 C\'est ton tour !' : `⏳ Tour de ${next?.name}`);
      }
    });

    socket.on('playerDisconnected', ({ game: updatedGame }) => {
      setGame(updatedGame);
      showMessage('⚠️ Un joueur s\'est déconnecté');
    });

    return () => {
      socket.off('gameUpdated');
      socket.off('playerDisconnected');
    };
  }, [playerId]);

  const showMessage = (msg) => {
    setMessage(msg);
    messageAnim.setValue(1);
    Animated.timing(messageAnim, {
      toValue: 0,
      duration: 3000,
      useNativeDriver: true,
    }).start();
  };

  const handleSelectPile = (pileKey) => {
    if (!isMyTurn) return showMessage('❌ Ce n\'est pas ton tour');
    if (selectedCard === null) return showMessage('👆 Sélectionne une carte d\'abord');
    if (!canPlayOnPile(pileKey, selectedCard)) return showMessage('❌ Cette carte ne peut pas aller ici');
    setPendingPlay({ card: selectedCard, pileKey });
  };

  const handleConfirm = () => {
    if (!pendingPlay) return;
    socket.emit(
      'playCard',
      { code: game.code, cardValue: pendingPlay.card, pileKey: pendingPlay.pileKey },
      (response) => {
        if (!response.success) {
          showMessage(`❌ ${response.error}`);
          setPendingPlay(null);
        }
      }
    );
  };

  const handleCancel = () => {
    setPendingPlay(null);
    setSelectedCard(null);
  };

  const handleEndTurn = () => {
    if (!isMyTurn) return;
    if (pendingPlay) return showMessage('⚠️ Confirme ou annule d\'abord');
    socket.emit('endTurn', { code: game.code }, (response) => {
      if (!response.success) showMessage(`❌ ${response.error}`);
    });
  };

  const getPileTop = (pileKey) => {
    const pile = game.piles[pileKey];
    return pile[pile.length - 1];
  };

  const canPlayOnPile = (pileKey, cardValue) => {
    if (cardValue === null) return false;
    const top = getPileTop(pileKey);
    const isAsc = pileKey.startsWith('asc');
    if (isAsc) return cardValue > top || cardValue === top - 10;
    return cardValue < top || cardValue === top + 10;
  };

  const renderPile = (pileKey, icon) => {
    const top = getPileTop(pileKey);
    const isAsc = pileKey.startsWith('asc');
    const isPending = pendingPlay?.pileKey === pileKey;
    const canPlay = isMyTurn && canPlayOnPile(pileKey, selectedCard) && !pendingPlay;

    return (
      <TouchableOpacity
        key={pileKey}
        style={[
          styles.pile,
          canPlay && styles.pileActive,
          isPending && styles.pilePending,
          selectedCard !== null && !canPlay && !isPending && isMyTurn && styles.pileDisabled,
        ]}
        onPress={() => handleSelectPile(pileKey)}
        disabled={!isMyTurn || (selectedCard === null && !pendingPlay)}
      >
        <Text style={styles.pileIcon}>{icon}</Text>
        <Text style={[styles.pileValue, isPending && styles.pileValueFaded]}>
          {top}
        </Text>
        {isPending && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingPlay.card}</Text>
          </View>
        )}
        <Text style={styles.pileLabel}>{isAsc ? 'MONTE' : 'DESCEND'}</Text>
      </TouchableOpacity>
    );
  };

  const renderCard = (card) => {
    const isSelected = selectedCard === card;
    const isPendingCard = pendingPlay?.card === card;

    return (
      <TouchableOpacity
        key={card}
        style={[
          styles.card,
          isSelected && styles.cardSelected,
          isPendingCard && styles.cardPending,
          (!isMyTurn || pendingPlay) && styles.cardDisabled,
        ]}
        onPress={() => {
          if (!isMyTurn) return showMessage('❌ Ce n\'est pas ton tour');
          if (pendingPlay) return showMessage('⚠️ Confirme ou annule d\'abord');
          setSelectedCard(isSelected ? null : card);
        }}
      >
        <Text style={[
          styles.cardText,
          isSelected && styles.cardTextSelected,
          isPendingCard && styles.cardTextPending,
        ]}>
          {card}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* MESSAGE FLOTTANT */}
      {message !== '' && (
        <Animated.View style={[styles.floatingMessage, { opacity: messageAnim }]}>
          <Text style={styles.floatingMessageText}>{message}</Text>
        </Animated.View>
      )}

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.deckLabel}>PIOCHE</Text>
          <Text style={styles.deckCount}>{game.deck.remaining}</Text>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.turnText}>
            {isMyTurn ? '🎯 TON TOUR' : `⏳ ${currentPlayer?.name}`}
          </Text>
          {isMyTurn && (
            <Text style={styles.cardsPlayedText}>
              {game.cardsPlayedThisTurn}/{game.minCardsPerTurn} carte{game.minCardsPerTurn > 1 ? 's' : ''} jouée{game.minCardsPerTurn > 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.codeLabel}>CODE</Text>
          <Text style={styles.codeValue}>{game.code}</Text>
        </View>
      </View>

      {/* JOUEURS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.playersScroll}
        contentContainerStyle={styles.playersContainer}
      >
        {game.players.map((player, index) => (
          <View
            key={player.id}
            style={[
              styles.playerChip,
              index === game.currentPlayerIndex && styles.playerChipActive,
            ]}
          >
            <Text style={styles.playerChipName}>{player.name}</Text>
            <Text style={styles.playerChipCards}>🃏 {player.cardCount}</Text>
          </View>
        ))}
      </ScrollView>

      {/* PILES */}
      <View style={styles.pilesSection}>
        <Text style={styles.pilesLabel}>
          {pendingPlay
            ? '👇 Confirme ou annule ton coup'
            : selectedCard
            ? '👇 Choisis une pile'
            : 'Sélectionne une carte puis une pile'}
        </Text>
        <View style={styles.pilesRow}>
          {renderPile('asc1', '⬆️')}
          {renderPile('asc2', '⬆️')}
          {renderPile('desc1', '⬇️')}
          {renderPile('desc2', '⬇️')}
        </View>
      </View>

      {/* CONFIRMER / ANNULER */}
      {pendingPlay && (
        <View style={styles.confirmRow}>
          <TouchableOpacity style={styles.btnCancel} onPress={handleCancel}>
            <Text style={styles.btnCancelText}>✕ Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnConfirm} onPress={handleConfirm}>
            <Text style={styles.btnConfirmText}>✓ Confirmer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MAIN */}
      <View style={styles.handSection}>
        <Text style={styles.handLabel}>
          TA MAIN — {myPlayer?.hand?.length ?? 0} cartes
          {selectedCard !== null && !pendingPlay && ` · Sélectionné : ${selectedCard}`}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.handContainer}
        >
          {myPlayer?.hand?.sort((a, b) => a - b).map(renderCard)}
        </ScrollView>
      </View>

      {/* FIN DE TOUR */}
      {isMyTurn && (
        <TouchableOpacity
          style={[
            styles.btnEndTurn,
            (game.cardsPlayedThisTurn < game.minCardsPerTurn || pendingPlay) && styles.btnEndTurnDisabled,
          ]}
          onPress={handleEndTurn}
        >
          <Text style={styles.btnEndTurnText}>Fin du tour →</Text>
        </TouchableOpacity>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  floatingMessage: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: '#16161f',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    zIndex: 100,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  floatingMessageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2a',
  },
  headerLeft: { alignItems: 'center', minWidth: 50 },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerRight: { alignItems: 'center', minWidth: 50 },
  deckLabel: { color: '#555', fontSize: 9, letterSpacing: 2 },
  deckCount: { color: '#E8C547', fontSize: 22, fontWeight: '900' },
  turnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  cardsPlayedText: { color: '#555', fontSize: 11, marginTop: 2 },
  codeLabel: { color: '#555', fontSize: 9, letterSpacing: 2 },
  codeValue: { color: '#444', fontSize: 14, fontWeight: '700' },
  playersScroll: { maxHeight: 56, marginVertical: 8 },
  playersContainer: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  playerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161f',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    gap: 6,
  },
  playerChipActive: {
    borderColor: '#E8C547',
    backgroundColor: '#E8C54715',
  },
  playerChipName: { color: '#aaa', fontSize: 12, fontWeight: '600' },
  playerChipCards: { color: '#555', fontSize: 11 },
  pilesSection: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  pilesLabel: {
    color: '#555',
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: 'center',
  },
  pilesRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  pile: {
    flex: 1,
    backgroundColor: '#16161f',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a2a3a',
    minHeight: 110,
    justifyContent: 'center',
  },
  pileActive: {
    borderColor: '#E8C547',
    backgroundColor: '#E8C54715',
  },
  pilePending: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF5015',
  },
  pileDisabled: {
    opacity: 0.35,
  },
  pileIcon: { fontSize: 16, marginBottom: 4 },
  pileValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  pileValueFaded: {
    color: '#444',
    fontSize: 14,
  },
  pendingBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 4,
  },
  pendingBadgeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  pileLabel: {
    color: '#555',
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 4,
  },
  confirmRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 10,
  },
  btnCancel: {
    flex: 1,
    backgroundColor: '#2a2a3a',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  btnCancelText: {
    color: '#aaa',
    fontWeight: '700',
    fontSize: 15,
  },
  btnConfirm: {
    flex: 2,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  btnConfirmText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  handSection: {
    marginTop: 16,
    flex: 1,
  },
  handLabel: {
    color: '#555',
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  handContainer: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  card: {
    width: 58,
    height: 82,
    backgroundColor: '#16161f',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2a2a3a',
  },
  cardSelected: {
    borderColor: '#E8C547',
    backgroundColor: '#E8C54720',
    transform: [{ translateY: -10 }],
  },
  cardPending: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF5020',
    transform: [{ translateY: -10 }],
    opacity: 0.5,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  cardTextSelected: {
    color: '#E8C547',
  },
  cardTextPending: {
    color: '#4CAF50',
  },
  btnEndTurn: {
    backgroundColor: '#E8C547',
    margin: 16,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  btnEndTurnDisabled: {
    backgroundColor: '#2a2a3a',
  },
  btnEndTurnText: {
    color: '#0a0a0f',
    fontWeight: '800',
    fontSize: 16,
  },
});