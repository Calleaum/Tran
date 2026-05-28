import { Injectable } from '@nestjs/common';

@Injectable()
export class TournamentService {
  findAll() {
    return { message: 'Tournaments endpoint' };
  }
}
