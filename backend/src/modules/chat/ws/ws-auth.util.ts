import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

/**
 * Pulls the JWT out of a socket.io handshake and verifies it with the same
 * secret/strategy used for REST auth (see JwtStrategy). The client should
 * connect with:
 *   io(WS_URL + '/chat', { auth: { token: '<access_token>' } })
 *
 * Returns the userId (the `sub` claim) or null if missing/invalid.
 */
export function extractUserIdFromSocket(jwtService: JwtService, socket: Socket): string | null {
  const token =
    (socket.handshake.auth && (socket.handshake.auth as any).token) ||
    (socket.handshake.query && (socket.handshake.query as any).token) ||
    (socket.handshake.headers.authorization || '').replace('Bearer ', '');

  if (!token) return null;

  try {
    const payload = jwtService.verify(token, {
      secret: process.env.JWT_SECRET || 'your-secret-key',
    });
    return payload.sub || null;
  } catch {
    return null;
  }
}
