import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  @IsOptional()
  username?: string;

  // Peut être une URL absolue (photo 42) ou un chemin relatif servi par le
  // backend (/uploads/avatars/xxx.jpg) après upload : pas de @IsUrl() ici.
  @IsString()
  @MaxLength(500)
  @IsOptional()
  avatar?: string;
}
