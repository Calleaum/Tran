import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import {
  ChatGroup,
  ChatMessage,
  DmThread,
  ApiMessage,
  GlobalApiMessage,
  apiMessageToChatMessage,
  globalApiMessageToChatMessage,
} from './chatTypes';
import { getChatSocket } from '../services/socket';
import { chatService, friendsService } from '../services/api';
import { playClick } from '../sound';

interface ChatContextValue {
  me: { id: string; name: string };

  // --- Conversations privées (branchées sur le namespace socket `/chat`) ---
  dmThreads: Record<string, DmThread>;
  openDm: (peerId: string, peerName: string) => void;
  closeDm: (peerId: string) => void;
  sendDm: (peerId: string, text: string) => void;
  sendGlobal: (text: string) => void;
  markThreadRead: (peerId: string) => void;

  // --- Présence (émise par le ChatGateway) ---
  onlineIds: Set<string>;
  isOnline: (userId: string) => boolean;

  // --- Blocage (`POST /friends/:id/{block,unblock}`) ---
  blockedIds: Set<string>;
  blockedPlayers: { id: string; name: string; avatar?: string | null }[];
  blockPlayer: (peerId: string, peerName: string) => Promise<void>;
  unblockPlayer: (peerId: string) => Promise<void>;
  isBlocked: (peerId: string) => boolean;
  refreshBlocked: () => Promise<void>;

  // --- Chat global (temps réel) et groupes (pas encore de backend) ---
  globalMessages: ChatMessage[];
  groups: Record<string, ChatGroup>;
  unavailableReason: string;

  // --- Spectateur ---
  isSpectating: boolean;
  setIsSpectating: (value: boolean) => void;

  error: string | null;
  clearError: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

const NO_BACKEND_REASON = "Les groupes n'ont pas encore d'équivalent côté serveur.";

export function ChatProvider({
  children,
  user,
}: {
  children: ReactNode;
  user: { id: string; username: string };
}) {
  const me = useMemo(() => ({ id: user.id, name: user.username }), [user.id, user.username]);

  const [dmThreads, setDmThreads] = useState<Record<string, DmThread>>({});
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [blockedNames, setBlockedNames] = useState<Record<string, string>>({});
  const [blockedAvatars, setBlockedAvatars] = useState<Record<string, string | null | undefined>>(
    {},
  );
  const [globalMessages, setGlobalMessages] = useState<ChatMessage[]>([]);
  const [isSpectating, setIsSpectating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Nom d'affichage d'un correspondant : celui du fil s'il est déjà ouvert,
  // sinon l'id (le fil sera renommé à l'ouverture depuis la liste d'amis).
  const peerNameRef = useRef<Record<string, string>>({});

  const upsertMessage = useCallback((peerId: string, message: ChatMessage, bumpUnread: boolean) => {
    setDmThreads((prev) => {
      const thread = prev[peerId] ?? {
        peerId,
        peerName: peerNameRef.current[peerId] ?? peerId,
        status: 'open' as const,
        messages: [],
        unread: 0,
      };
      if (thread.messages.some((m) => m.id === message.id)) return prev;
      return {
        ...prev,
        [peerId]: {
          ...thread,
          status: 'open',
          messages: [...thread.messages, message],
          unread: bumpUnread ? thread.unread + 1 : thread.unread,
        },
      };
    });
  }, []);

  // ─── Socket `/chat` : présence + messages privés ───────────────────────
  useEffect(() => {
    const socket = getChatSocket();
    socketRef.current = socket;

    const onSnapshot = (data: { onlineFriendIds: string[] }) => {
      setOnlineIds(new Set(data.onlineFriendIds));
    };
    const onPresence = (data: { userId: string; online: boolean }) => {
      setOnlineIds((prev) => {
        const next = new Set(prev);
        if (data.online) next.add(data.userId);
        else next.delete(data.userId);
        return next;
      });
    };
    const onReceive = (message: ApiMessage) => {
      const peerId = message.senderId;
      const peerName = peerNameRef.current[peerId] ?? peerId;
      upsertMessage(peerId, apiMessageToChatMessage(message, me.id, me.name, peerName), true);
    };
    const onSent = (message: ApiMessage) => {
      const peerId = message.receiverId;
      const peerName = peerNameRef.current[peerId] ?? peerId;
      upsertMessage(peerId, apiMessageToChatMessage(message, me.id, me.name, peerName), false);
    };
    const onError = (data: { message: string }) => setError(data.message);
    const onGlobalSnapshot = (data: { messages: GlobalApiMessage[] }) => {
      setGlobalMessages(data.messages.map(globalApiMessageToChatMessage));
    };
    const onGlobalReceive = (message: GlobalApiMessage) => {
      setGlobalMessages((prev) => [...prev, globalApiMessageToChatMessage(message)]);
    };
    const onGlobalError = (data: { message: string }) => setError(data.message);

    socket.on('presence:snapshot', onSnapshot);
    socket.on('friend:presence', onPresence);
    socket.on('dm:receive', onReceive);
    socket.on('dm:sent', onSent);
    socket.on('dm:error', onError);
    socket.on('global:snapshot', onGlobalSnapshot);
    socket.on('global:receive', onGlobalReceive);
    socket.on('global:error', onGlobalError);

    return () => {
      socket.off('presence:snapshot', onSnapshot);
      socket.off('friend:presence', onPresence);
      socket.off('dm:receive', onReceive);
      socket.off('dm:sent', onSent);
      socket.off('dm:error', onError);
      socket.off('global:snapshot', onGlobalSnapshot);
      socket.off('global:receive', onGlobalReceive);
      socket.off('global:error', onGlobalError);
    };
  }, [me.id, me.name, upsertMessage]);

  // ─── Blocages ──────────────────────────────────────────────────────────
  const refreshBlocked = useCallback(async () => {
    try {
      const blocked = (await friendsService.blocked()) as {
        id: string;
        username: string;
        avatar?: string | null;
      }[];
      setBlockedIds(new Set(blocked.map((b) => b.id)));
      setBlockedNames(Object.fromEntries(blocked.map((b) => [b.id, b.username])));
      setBlockedAvatars(Object.fromEntries(blocked.map((b) => [b.id, b.avatar])));
    } catch {
      // Le blocage reste consultable depuis l'écran Social ; on n'écrase pas
      // l'état local si la requête échoue (par ex. réseau coupé).
    }
  }, []);

  useEffect(() => {
    void refreshBlocked();
  }, [refreshBlocked]);

  // ─── Conversations privées ─────────────────────────────────────────────

  const openDm = useCallback(
    (peerId: string, peerName: string) => {
      playClick();
      peerNameRef.current[peerId] = peerName;
      setDmThreads((prev) => ({
        ...prev,
        [peerId]: prev[peerId]
          ? { ...prev[peerId], peerName, status: 'open', unread: 0 }
          : { peerId, peerName, status: 'open', messages: [], unread: 0 },
      }));

      // Historique réel de la conversation, puis marquage comme lue.
      void (async () => {
        try {
          const messages = (await chatService.messages(peerId)) as ApiMessage[];
          setDmThreads((prev) => {
            const thread = prev[peerId];
            if (!thread) return prev;
            return {
              ...prev,
              [peerId]: {
                ...thread,
                messages: messages.map((m) => apiMessageToChatMessage(m, me.id, me.name, peerName)),
                unread: 0,
              },
            };
          });
          await chatService.markAsRead(peerId);
        } catch {
          setError("Impossible de charger l'historique de cette conversation.");
        }
      })();
    },
    [me.id, me.name],
  );

  const closeDm = useCallback((peerId: string) => {
    playClick();
    setDmThreads((prev) => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  const sendDm = useCallback((peerId: string, text: string) => {
    const content = text.trim();
    if (!content) return;
    // Le message n'est ajouté au fil qu'au retour de `dm:sent` : ce qui
    // s'affiche est donc toujours ce que le serveur a réellement enregistré.
    socketRef.current?.emit('dm:send', { receiverId: peerId, content });
  }, []);

  const sendGlobal = useCallback((text: string) => {
    const content = text.trim();
    if (!content) return;
    socketRef.current?.emit('global:send', { content });
  }, []);

  const markThreadRead = useCallback((peerId: string) => {
    setDmThreads((prev) => {
      const thread = prev[peerId];
      if (!thread || thread.unread === 0) return prev;
      return { ...prev, [peerId]: { ...thread, unread: 0 } };
    });
    void chatService.markAsRead(peerId).catch(() => undefined);
  }, []);

  const blockPlayer = useCallback(
    async (peerId: string, peerName: string) => {
      playClick();
      try {
        await friendsService.block(peerId);
        peerNameRef.current[peerId] = peerName;
        await refreshBlocked();
        // Un joueur bloqué ne peut plus échanger avec nous : le fil est fermé.
        setDmThreads((prev) => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      } catch {
        setError(`Impossible de bloquer ${peerName}.`);
      }
    },
    [refreshBlocked],
  );

  const unblockPlayer = useCallback(
    async (peerId: string) => {
      playClick();
      try {
        await friendsService.unblock(peerId);
        await refreshBlocked();
      } catch {
        setError('Impossible de débloquer ce joueur.');
      }
    },
    [refreshBlocked],
  );

  const isBlocked = useCallback((peerId: string) => blockedIds.has(peerId), [blockedIds]);
  const isOnline = useCallback((userId: string) => onlineIds.has(userId), [onlineIds]);

  const blockedPlayers = useMemo(
    () =>
      Array.from(blockedIds).map((id) => ({
        id,
        name: blockedNames[id] ?? id,
        avatar: blockedAvatars[id],
      })),
    [blockedIds, blockedNames, blockedAvatars],
  );

  const value: ChatContextValue = {
    me,
    dmThreads,
    openDm,
    closeDm,
    sendDm,
    markThreadRead,
    onlineIds,
    isOnline,
    blockedIds,
    blockedPlayers,
    blockPlayer,
    unblockPlayer,
    isBlocked,
    refreshBlocked,
    globalMessages,
    sendGlobal,
    groups: {},
    unavailableReason: NO_BACKEND_REASON,
    isSpectating,
    setIsSpectating,
    error,
    clearError: () => setError(null),
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat doit être utilisé à l\'intérieur de <ChatProvider>');
  return ctx;
}
