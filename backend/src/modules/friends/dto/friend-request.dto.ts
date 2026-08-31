import { IsUUID } from 'class-validator';

export class FriendRequestDto {
  @IsUUID()
  targetUserId!: string;
}
