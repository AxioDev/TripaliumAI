import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ServerOptions, Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(
    app: INestApplicationContext,
    private readonly redisUrl?: string,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    if (!this.redisUrl) {
      this.logger.warn(
        'REDIS_URL not provided. WebSocket will run in single-instance mode.',
      );
      return;
    }

    try {
      const pubClient = new Redis(this.redisUrl, {
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.error('Could not connect to Redis for WebSocket adapter');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
      });

      const subClient = pubClient.duplicate();

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          pubClient.on('connect', resolve);
          pubClient.on('error', reject);
        }),
        new Promise<void>((resolve, reject) => {
          subClient.on('connect', resolve);
          subClient.on('error', reject);
        }),
      ]);

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('Redis adapter connected for WebSocket scaling');
    } catch (error) {
      this.logger.warn(
        'Failed to connect Redis adapter. WebSocket will run in single-instance mode.',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }
}
