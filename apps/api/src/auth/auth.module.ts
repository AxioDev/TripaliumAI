import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ApiKeyService } from './api-key.service';
import { ApiKeyController } from './api-key.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { LogModule } from '../log/log.module';
import { StorageModule } from '../storage/storage.module';
import { EmailModule } from '../email/email.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '7d',
        },
      }),
      inject: [ConfigService],
    }),
    LogModule,
    StorageModule,
    EmailModule,
    BillingModule,
  ],
  controllers: [AuthController, ApiKeyController],
  providers: [AuthService, ApiKeyService, JwtStrategy, ApiKeyStrategy],
  exports: [AuthService, ApiKeyService],
})
export class AuthModule {}
