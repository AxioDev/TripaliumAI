import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { LogModule } from '../log/log.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [LogModule, StorageModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
