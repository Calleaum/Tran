import { IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreatePresidentGameDto {
  @IsInt()
  @Min(3)
  @Max(6)
  @IsOptional()
  maxPlayers?: number;
}
