import { Injectable } from '@nestjs/common';

@Injectable()
export class GameService {
  findAll() {
    return { message: 'Games endpoint' };
  }
}
