import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from '@/stores/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

/**
 * 백엔드 8단계 NotificationsGateway(`/ws/notifications`)에 연결한다.
 * 인증은 Access Token만 사용하며, 토큰 만료/재발급 시 재연결은 이 함수를
 * 다시 호출하는 쪽(useNotificationSocket)이 책임진다 - 소켓 자체는 자동 갱신하지 않는다.
 */
export function connectNotificationSocket(): Socket | null {
  const token = getAccessToken();
  if (!token) return null;

  if (socket?.connected) return socket;

  socket = io(`${API_BASE_URL}/ws/notifications`, {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 5,
  });

  return socket;
}

export function disconnectNotificationSocket(): void {
  socket?.disconnect();
  socket = null;
}
