import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { CvModule } from './cv/cv.module';
import { CampaignModule } from './campaign/campaign.module';
import { JobModule } from './job/job.module';
import { ApplicationModule } from './application/application.module';
import { LogModule } from './log/log.module';
import { QueueModule } from './queue/queue.module';
import { LlmModule } from './llm/llm.module';
import { EmailModule } from './email/email.module';
import { StorageModule } from './storage/storage.module';
import { TestModule } from './test/test.module';
import { RealtimeModule } from './realtime/realtime.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10) * 1000,
        limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      },
    ]),

    // Core modules
    PrismaModule,
    AuthModule,
    RealtimeModule,
    ProfileModule,
    CvModule,
    CampaignModule,
    JobModule,
    ApplicationModule,
    LogModule,
    QueueModule,
    LlmModule,
    EmailModule,
    StorageModule,
    TestModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
