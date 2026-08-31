import { Injectable } from '@nestjs/common';

// Tracks which users are currently connected via WebSocket.
// A user can have multiple sockets open (multiple tabs/devices), so we
// keep a Set of socket ids per user and only consider them "offline"
// once the last socket disconnects.
//
// NOTE: this is in-memory and per-process. Since docker-compose currently
// runs a single `backend` replica, that's fine. If you ever scale to
// multiple backend replicas, swap this for Redis (SADD/SREM + pub/sub)
// so presence and message delivery work across instances.
@Injectable()
export class PresenceService {
  private userSockets = new Map<string, Set<string>>();

  /** Registers a socket for a user. Returns true if this is the user's first socket (went online). */
  addSocket(userId: string, socketId: string): boolean {
    const wasOffline = !this.userSockets.has(userId) || this.userSockets.get(userId)!.size === 0;
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
    return wasOffline;
  }

  /** Removes a socket for a user. Returns true if the user has no sockets left (went offline). */
  removeSocket(userId: string, socketId: string): boolean {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return true;
    sockets.delete(socketId);
    const wentOffline = sockets.size === 0;
    if (wentOffline) {
      this.userSockets.delete(userId);
    }
    return wentOffline;
  }

  isOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  getOnlineUserIds(userIds: string[]): string[] {
    return userIds.filter((id) => this.isOnline(id));
  }

  getAllOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }
}
