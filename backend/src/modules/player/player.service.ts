import { Injectable } from '@nestjs/common';

@Injectable()
export class PlayerService {
  findAll() {
    return { message: 'Players endpoint' };
  }
}
