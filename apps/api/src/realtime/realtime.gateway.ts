import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RealtimeService } from './realtime.service';
import { JwtPayload } from '../auth/auth.service';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from './events.types';

type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: TypedServer;

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: TypedServer) {
    this.realtimeService.setServer(server);
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: TypedSocket) {
    try {
      // Authenticate connection
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.emit('error' as any, { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const payload = await this.verifyToken(token);

      if (!payload) {
        this.logger.warn(`Connection rejected: Invalid token`);
        client.emit('error' as any, { message: 'Invalid authentication token' });
        client.disconnect();
        return;
      }

      // Store user data in socket
      client.data.userId = payload.sub;
      client.data.email = payload.email;

      // Join user-specific room for targeted emissions
      const userRoom = `user:${payload.sub}`;
      await client.join(userRoom);

      this.logger.log(
        `Client connected: ${client.id} (user: ${payload.email})`,
      );

      // Send connection success event
      client.emit('notification', {
        id: `connected-${Date.now()}`,
        type: 'campaign_status',
        title: 'Connected',
        message: 'Real-time updates enabled',
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: TypedSocket) {
    const userId = client.data.userId;
    this.logger.log(
      `Client disconnected: ${client.id}${userId ? ` (user: ${userId})` : ''}`,
    );
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { type: 'campaign' | 'cv' | 'application'; id: string },
  ) {
    if (!client.data.userId) {
      return { success: false, error: 'Not authenticated' };
    }

    const room = `${data.type}:${data.id}`;
    client.join(room);
    this.logger.debug(
      `User ${client.data.userId} subscribed to ${room}`,
    );

    return { success: true, room };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { type: 'campaign' | 'cv' | 'application'; id: string },
  ) {
    const room = `${data.type}:${data.id}`;
    client.leave(room);
    this.logger.debug(
      `User ${client.data.userId} unsubscribed from ${room}`,
    );

    return { success: true };
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: TypedSocket) {
    return { pong: true, timestamp: Date.now() };
  }

  private extractToken(client: Socket): string | undefined {
    // Try auth object (recommended)
    const authToken = client.handshake.auth?.token;
    if (authToken) return authToken;

    // Try query parameter
    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string') return queryToken;

    // Try Authorization header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return undefined;
  }

  private async verifyToken(token: string): Promise<JwtPayload | null> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      return null;
    }
  }
}
