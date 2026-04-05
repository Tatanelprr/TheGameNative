// client/screens/GameScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Defs, Marker, Line } from 'react-native-svg';
import socket from '../utils/socket';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HAND_PADDING = 16;
const CARD_GAP = 8;
const COLS = 4;
const CARD_WIDTH = (SCREEN_WIDTH - HAND_PADDING * 2 - CARD_GAP * (COLS - 1)) / COLS;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

export default function GameScreen({ navigation, route }) {
  const { game: initialGame, playerId } = route.params;
  const [game, setGame] = useState(initialGame);
  const [selectedCard, setSelectedCard] = useState(null);
  const [pendingPlay, setPendingPlay] = useState(null);
  const [message, setMessage] = useState('');
  const messageAnim = useRef(new Animated.Value(0)).current;

  const myPlayer = game.players.find(p => p.id === playerId);
  const currentPlayer = game.players[game.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === playerId;
  const sortedHand = [...(myPlayer?.hand ?? [])].sort((a, b) => a - b);

  // Paires à 10 d'écart
  const linkedPairs = [];
  for (let i = 0; i < sortedHand.length; i++) {
    for (let j = i + 1; j < sortedHand.length; j++) {
      if (sortedHand[j] - sortedHand[i] === 10) {
        linkedPairs.push([i, j]);
      }
    }
  }

  // Position X/Y du centre d'une carte dans la grille
  const getCardCenter = (index) => {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    const x = HAND_PADDING + col * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2;
    const y = row * (CARD_HEIGHT + CARD_GAP) + CARD_HEIGHT / 2;
    return { x, y };
  };

  const numRows = Math.ceil(sortedHand.length / COLS);
  const gridHeight = numRows * (CARD_HEIGHT + CARD_GAP);
  const svgHeight = gridHeight + 20;

  const renderArcs = () => {
    if (linkedPairs.length === 0) return null;

    return (
      <Svg
        width={SCREEN_WIDTH}
        height={svgHeight}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <Marker
            id="arrowhead"
            markerWidth="6"
            markerHeight="6"
            refX="3"
            refY="3"
            orient="auto"
          >
            <Line
              x1="0" y1="0" x2="6" y2="3"
              stroke="#4ade80"
              strokeWidth="1.5"
            />
            <Line
              x1="0" y1="6" x2="6" y2="3"
              stroke="#4ade80"
              strokeWidth="1.5"
            />
          </Marker>
        </Defs>
        {linkedPairs.map(([i, j], idx) => {
          const from = getCardCenter(i);
          const to = getCardCenter(j);

          const sameRow = Math.floor(i / COLS) === Math.floor(j / COLS);

          let d;
          if (sameRow) {
            // Arc simple sous les cartes
            const midX = (from.x + to.x) / 2;
            const arcDepth = Math.min(30, (to.x - from.x) * 0.4);
            const baseY = from.y + CARD_HEIGHT / 2 + 6;
            d = `M ${from.x} ${baseY} Q ${midX} ${baseY + arcDepth} ${to.x} ${baseY}`;
          } else {
            // Courbe de Bézier entre deux lignes
            const fromY = from.y + CARD_HEIGHT / 2 + 6;
            const toY = to.y - CARD_HEIGHT / 2 - 6;
            const cp1x = from.x + (to.x - from.x) * 0.1;
            const cp1y = fromY + (toY - fromY) * 0.4;
            const cp2x = to.x - (to.x - from.x) * 0.1;
            const cp2y = fromY + (toY - fromY) * 0.6;
            d = `M ${from.x} ${fromY} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${to.x} ${toY}`;
          }

          return (
            <Path
              key={idx}
              d={d}
              stroke="#4ade80"
              strokeWidth={1.5}
              fill="none"
              strokeDasharray="5 3"
              opacity={0.6}
              markerEnd="url(#arrowhead)"
            />
          );
        })}
      </Svg>
    );
  };

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

  const isExactlyTenBack = (pileKey, cardValue) => {
    const top = getPileTop(pileKey);
    const isAsc = pileKey.startsWith('asc');
    if (isAsc) return cardValue === top - 10;
    return cardValue === top + 10;
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
    const isTenBack = isMyTurn && selectedCard !== null && isExactlyTenBack(pileKey, selectedCard) && !pendingPlay;

    return (
      <TouchableOpacity
        key={pileKey}
        style={[
          styles.pile,
          canPlay && !isTenBack && styles.pileActive,
          canPlay && isTenBack && styles.pileTenBack,
          isPending && styles.pilePending,
          selectedCard !== null && !canPlay && !isPending && isMyTurn && styles.pileDisabled,
        ]}
        onPress={() => handleSelectPile(pileKey)}
        disabled={!isMyTurn || (selectedCard === null && !pendingPlay)}
      >
        <Text style={styles.pileIcon}>{icon}</Text>
        <Text style={[styles.pileValue, isPending && styles.pileValueFaded]}>{top}</Text>
        {isTenBack && !isPending && (
          <View style={styles.tenBackBadge}>
            <Text style={styles.tenBackBadgeText}>↩ 10</Text>
          </View>
        )}
        {isPending && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingPlay.card}</Text>
          </View>
        )}
        <Text style={styles.pileLabel}>{isAsc ? 'MONTE' : 'DESCEND'}</Text>
      </TouchableOpacity>
    );
  };

  const renderCard = (card, index) => {
    const isSelected = selectedCard === card;
    const isPendingCard = pendingPlay?.card === card;
    const isLinked = linkedPairs.some(([i, j]) => i === index || j === index);

    return (
      <TouchableOpacity
        key={card}
        style={[
          styles.card,
          isLinked && styles.cardLinked,
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
          isLinked && styles.cardTextLinked,
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

      {/* MAIN EN GRILLE */}
      <View style={styles.handSection}>
        <Text style={styles.handLabel}>
          TA MAIN — {sortedHand.length} cartes
          {selectedCard !== null && !pendingPlay && ` · Sélectionné : ${selectedCard}`}
        </Text>
        <View style={styles.gridWrapper}>
          {/* GRILLE DE CARTES */}
          <View style={styles.grid}>
            {sortedHand.map((card, index) => renderCard(card, index))}
          </View>
          {/* ARCS SVG PAR DESSUS */}
          {renderArcs()}
        </View>
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
    minHeight: 100,
    justifyContent: 'center',
  },
  pileActive: {
    borderColor: '#E8C547',
    backgroundColor: '#E8C54715',
  },
  pileTenBack: {
    borderColor: '#4ade80',
    backgroundColor: '#4ade8015',
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
  tenBackBadge: {
    backgroundColor: '#4ade8030',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#4ade80',
  },
  tenBackBadgeText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '700',
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
    marginTop: 12,
    flex: 1,
    paddingBottom: 8,
  },
  handLabel: {
    color: '#555',
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  gridWrapper: {
    position: 'relative',
    paddingHorizontal: HAND_PADDING,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#16161f',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2a2a3a',
  },
  cardLinked: {
    borderColor: '#4ade8060',
  },
  cardSelected: {
    borderColor: '#E8C547',
    backgroundColor: '#E8C54720',
    transform: [{ translateY: -6 }],
  },
  cardPending: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF5020',
    transform: [{ translateY: -6 }],
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
  cardTextLinked: {
    color: '#4ade80',
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