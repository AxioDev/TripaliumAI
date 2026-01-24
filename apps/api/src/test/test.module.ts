import { Module } from '@nestjs/common';
import { TestController } from './test.controller';
import { LogModule } from '../log/log.module';

@Module({
  imports: [LogModule],
  controllers: [TestController],
})
export class TestModule {}
