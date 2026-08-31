import { IsArray, ValidateNested, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { Rank, Suit } from 'src/entities/president-game.entity';

const RANKS: Rank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

class CardDto {
  @IsString()
  @IsIn(RANKS)
  rank!: Rank;

  @IsString()
  @IsIn(SUITS)
  suit!: Suit;
}

export class PlayCardsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CardDto)
  cards!: CardDto[];
}
