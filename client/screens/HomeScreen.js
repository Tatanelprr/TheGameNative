// client/screens/HomeScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import socket from '../utils/socket';

export default function HomeScreen({ navigation }) {
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [loading, setLoading] = useState(false);

  const handleCreateGame = () => {
    if (!playerName.trim()) return Alert.alert('Erreur', 'Entre ton prénom');
    setLoading(true);

    socket.connect();
    socket.emit('createGame', { playerName: playerName.trim() }, (response) => {
      setLoading(false);
      if (response.success) {
        navigation.navigate('Lobby', {
          game: response.game,
          playerId: socket.id,
          playerName: playerName.trim(),
        });
      } else {
        Alert.alert('Erreur', response.error);
        socket.disconnect();
      }
    });
  };

  const handleJoinGame = () => {
    if (!playerName.trim()) return Alert.alert('Erreur', 'Entre ton prénom');
    if (!joinCode.trim()) return Alert.alert('Erreur', 'Entre le code de la partie');
    setLoading(true);

    socket.connect();
    socket.emit(
      'joinGame',
      { code: joinCode.trim().toUpperCase(), playerName: playerName.trim() },
      (response) => {
        setLoading(false);
        if (response.success) {
          navigation.navigate('Lobby', {
            game: response.game,
            playerId: socket.id,
            playerName: playerName.trim(),
          });
        } else {
          Alert.alert('Erreur', response.error);
          socket.disconnect();
        }
      }
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* TITRE */}
      <View style={styles.header}>
        <Text style={styles.title}>THE</Text>
        <Text style={styles.titleBig}>GAME</Text>
        <Text style={styles.subtitle}>Jouez ensemble contre le jeu</Text>
      </View>

      {/* CHAMP NOM */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>TON PRÉNOM</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Ethan"
          placeholderTextColor="#444"
          value={playerName}
          onChangeText={setPlayerName}
          maxLength={16}
          autoCapitalize="words"
        />
      </View>

      {/* BOUTONS MODE */}
      {!mode && (
        <View style={styles.modeButtons}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => setMode('create')}
          >
            <Text style={styles.btnPrimaryText}>🎮 Créer une partie</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => setMode('join')}
          >
            <Text style={styles.btnSecondaryText}>🔑 Rejoindre une partie</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* CRÉER */}
      {mode === 'create' && (
        <View style={styles.section}>
          <Text style={styles.sectionInfo}>
            Un code sera généré pour tes amis
          </Text>
          {loading ? (
            <ActivityIndicator size="large" color="#E8C547" />
          ) : (
            <>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleCreateGame}>
                <Text style={styles.btnPrimaryText}>Créer la partie →</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMode(null)}>
                <Text style={styles.backText}>← Retour</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* REJOINDRE */}
      {mode === 'join' && (
        <View style={styles.section}>
          <Text style={styles.label}>CODE DE LA PARTIE</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="Ex: AB3K"
            placeholderTextColor="#444"
            value={joinCode}
            onChangeText={setJoinCode}
            maxLength={4}
            autoCapitalize="characters"
          />
          {loading ? (
            <ActivityIndicator size="large" color="#E8C547" />
          ) : (
            <>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleJoinGame}>
                <Text style={styles.btnPrimaryText}>Rejoindre →</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMode(null)}>
                <Text style={styles.backText}>← Retour</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: '300',
    color: '#888',
    letterSpacing: 12,
  },
  titleBig: {
    fontSize: 72,
    fontWeight: '900',
    color: '#E8C547',
    letterSpacing: 8,
    lineHeight: 80,
  },
  subtitle: {
    fontSize: 13,
    color: '#555',
    letterSpacing: 2,
    marginTop: 8,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 24,
  },
  label: {
    color: '#666',
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#16161f',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    width: '100%',
  },
  codeInput: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    color: '#E8C547',
  },
  modeButtons: {
    width: '100%',
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: '#E8C547',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    width: '100%',
  },
  btnPrimaryText: {
    color: '#0a0a0f',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  btnSecondaryText: {
    color: '#aaa',
    fontWeight: '600',
    fontSize: 16,
  },
  section: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  sectionInfo: {
    color: '#555',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  backText: {
    color: '#555',
    fontSize: 14,
    marginTop: 8,
  },
});