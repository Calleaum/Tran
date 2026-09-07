import { IsOptional, IsInt, IsString, Min, Max, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePresidentGameDto {
  @IsInt()
  @Min(3)
  @Max(6)
  @IsOptional()
  maxPlayers?: number;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;
}
