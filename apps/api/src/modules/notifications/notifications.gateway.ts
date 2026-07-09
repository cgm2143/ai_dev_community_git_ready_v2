import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { JwtConfig } from '../../config/configuration';
import { JwtPayload } from '../auth/types/jwt-payload.interface';
import { NOTIFICATION_BROADCAST_CHANNEL } from './notifications.service';

interface NotificationBroadcastPayload {
  userId: string;
  notification: unknown;
}

/**
 * 실시간 알림 WebSocket Gateway. 1단계 아키텍처 결정에 따라 초기에는 백엔드 프로세스에
 * 통합되어 있다. 다중 인스턴스로 확장할 때는, 각 인스턴스가 동일한 Redis 채널
 * (`notifications:broadcast`)을 구독하고 있으므로 이 클래스의 코드 변경 없이 그대로
 * 수평 확장이 가능하다 (Socket.IO의 공식 Redis 어댑터 대신, 이미 구축되어 있는
 * RedisService의 Pub/Sub 원시 기능을 재사용해 일관성을 유지했다).
 */
@Injectable()
@WebSocketGateway({
  namespace: '/ws/notifications',
  cors: { origin: true, credentials: true },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit(): void {
    this.redis.subscribe(NOTIFICATION_BROADCAST_CHANNEL, (_channel, message) => {
      this.handleBroadcast(message);
    });
  }

  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const userId = await this.authenticate(client);
      client.data.userId = userId;
      await client.join(this.roomFor(userId));
    } catch (error) {
      this.logger.warn(`알림 소켓 인증 실패: ${(error as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(@ConnectedSocket() _client: Socket): void {
    // Socket.IO가 연결 종료 시 룸 멤버십을 자동으로 정리하므로 별도 처리가 필요 없다.
  }

  private async authenticate(client: Socket): Promise<string> {
    const token = this.extractToken(client);
    if (!token) {
      throw new Error('토큰이 없습니다.');
    }

    const jwtConfig = this.configService.get<JwtConfig>('jwt');
    const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: jwtConfig?.accessSecret,
    });

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new Error('유효하지 않은 사용자입니다.');
    }

    return user.id;
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token as string | undefined;
    const queryToken = client.handshake.query?.token as string | undefined;
    return authToken ?? queryToken;
  }

  private handleBroadcast(message: string): void {
    try {
      const payload = JSON.parse(message) as NotificationBroadcastPayload;
      this.server.to(this.roomFor(payload.userId)).emit('notification:new', payload.notification);
    } catch (error) {
      this.logger.warn(`알림 브로드캐스트 처리 실패: ${(error as Error).message}`);
    }
  }

  private roomFor(userId: string): string {
    return `user:${userId}`;
  }
}
