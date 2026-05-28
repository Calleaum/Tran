import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Welcome to Transcendence API!';
  }

  health(): { status: string } {
    return { status: 'OK' };
  }
}
