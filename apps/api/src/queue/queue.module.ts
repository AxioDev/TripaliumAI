import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';

@Global()
@Module({
  providers: [
    {
      provide: 'QUEUE_CONNECTION',
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (!redisUrl) {
          console.warn(
            'REDIS_URL not configured, using in-memory queue (not suitable for production)',
          );
          return null;
        }
        return redisUrl;
      },
      inject: [ConfigService],
    },
    QueueService,
  ],
  exports: [QueueService],
})
export class QueueModule {}
