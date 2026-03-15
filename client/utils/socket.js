// client/utils/socket.js
import { io } from 'socket.io-client';

// ⚠️ Remplace par l'IP locale de ton PC
// Pour trouver ton IP : tape "ipconfig" dans le terminal Windows
// Cherche "Adresse IPv4" ex: 192.168.1.42
const SERVER_URL = 'http://TON_IP_LOCALE:3000';

const socket = io(SERVER_URL, {
  transports: ['websocket'],
  autoConnect: false,
});

export default socket;