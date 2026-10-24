import { Controller, Get } from '@nestjs/common';

@Controller('api')
export class InfoController {
  @Get('status')
  getStatus() {
    return {
      status: 'ONLINE',
      timestamp: Date.now(),
      service: 'guessiha-gateway',
    };
  }
}
