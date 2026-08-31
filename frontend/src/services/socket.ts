// Connexions socket.io vers les deux gateways du backend :
//   - namespace par défaut  → GameGateway   (président : join/play/pass/chat de table)
//   - namespace `/chat`     → ChatGateway   (messages privés, présence, typing)
// Les deux s'authentifient avec le même JWT, passé dans `auth.token`.

import { io, Socket } from 'socket.io-client';
import { TOKEN_KEY } from './api';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

let gameSocket: Socket | null = null;
let chatSocket: Socket | null = null;

const authPayload = () => ({ token: localStorage.getItem(TOKEN_KEY) });

export function getGameSocket(): Socket {
  if (!gameSocket) {
    gameSocket = io(WS_URL, { auth: authPayload(), autoConnect: true });
  }
  return gameSocket;
}

export function getChatSocket(): Socket {
  if (!chatSocket) {
    chatSocket = io(`${WS_URL}/chat`, { auth: authPayload(), autoConnect: true });
  }
  return chatSocket;
}

// À appeler au logout : les sockets portent le JWT de l'ancienne session.
export function disconnectSockets() {
  gameSocket?.disconnect();
  chatSocket?.disconnect();
  gameSocket = null;
  chatSocket = null;
}
