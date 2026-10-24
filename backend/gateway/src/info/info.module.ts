import { Module } from '@nestjs/common';
import { InfoController } from './info.controller';

@Module({
  controllers: [InfoController],
})
export class InfoModule {}
