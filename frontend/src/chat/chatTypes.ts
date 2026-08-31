// Modèle du chat côté client.
//
// Seules les conversations privées ont un backend (`ChatGateway`, namespace
// `/chat`, + `GET /chat/*`). Le chat global et les groupes n'existent pas
// encore côté serveur : leur UI est conservée mais reste vide et en lecture
// seule tant qu'aucun endpoint ne les alimente.

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  timestamp: number;
  system?: boolean;
}

/** Une conversation privée est ouverte ou fermée : le backend ne connaît pas de demande à accepter. */
export type DmStatus = 'open' | 'closed';

export interface DmThread {
  peerId: string;
  peerName: string;
  status: DmStatus;
  messages: ChatMessage[];
  unread: number;
}

export interface ChatMember {
  id: string;
  name: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  members: ChatMember[];
  messages: ChatMessage[];
}

export interface GlobalApiMessage {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  timestamp: number;
}

/** Message tel qu'il arrive du serveur (`dm:receive` / `dm:sent` / `GET /chat/conversations/:id/messages`). */
export interface ApiMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  readAt?: string | null;
}

export function apiMessageToChatMessage(
  message: ApiMessage,
  myId: string,
  myName: string,
  peerName: string,
): ChatMessage {
  const mine = message.senderId === myId;
  return {
    id: message.id,
    authorId: message.senderId,
    authorName: mine ? myName : peerName,
    text: message.content,
    timestamp: new Date(message.createdAt).getTime(),
  };
}

export function globalApiMessageToChatMessage(message: GlobalApiMessage): ChatMessage {
  return {
    id: message.id,
    authorId: message.authorId,
    authorName: message.authorName,
    text: message.text,
    timestamp: message.timestamp,
  };
}
