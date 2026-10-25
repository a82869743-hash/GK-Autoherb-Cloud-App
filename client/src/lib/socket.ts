import { io, Socket } from 'socket.io-client';

/**
 * Socket.io connection to the API server.
 *
 * VITE_API_URL is a path ("/api"), not a host — passing it to io() made socket.io treat it as
 * a namespace called "/api", so live tracking never received a single update. The socket must
 * connect to the server origin: the same origin in dev (Vite proxies /socket.io) and in
 * production (nginx), unless VITE_SOCKET_URL points somewhere else.
 */
export function socketOrigin(): string {
  const explicit = import.meta.env.VITE_SOCKET_URL as string | undefined;
  if (explicit) return explicit;
  const api = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
  if (/^https?:\/\//.test(api)) return new URL(api).origin;
  return window.location.origin;
}

export function createSocket(token?: string | null, opts: { autoConnect?: boolean } = {}): Socket {
  return io(socketOrigin(), {
    auth: token ? { token } : undefined,
    transports: ['websocket', 'polling'],
    autoConnect: opts.autoConnect ?? true,
    reconnection: true,
    reconnectionDelay: 1500,
  });
}
