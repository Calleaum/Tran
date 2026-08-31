import { IsString, IsOptional, MinLength, MaxLength, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  @IsOptional()
  username?: string;

  @IsUrl()
  @IsOptional()
  avatar?: string;
}
