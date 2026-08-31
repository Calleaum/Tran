import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FriendsService } from './friends.service';
import { FriendRequestDto } from './dto/friend-request.dto';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  list(@Request() req: any) {
    return this.friendsService.listFriends(req.user.id);
  }

  @Get('requests/incoming')
  incoming(@Request() req: any) {
    return this.friendsService.listIncomingRequests(req.user.id);
  }

  @Get('requests/outgoing')
  outgoing(@Request() req: any) {
    return this.friendsService.listOutgoingRequests(req.user.id);
  }

  @Get('blocked')
  blocked(@Request() req: any) {
    return this.friendsService.listBlocked(req.user.id);
  }

  @Post('requests')
  sendRequest(@Request() req: any, @Body() dto: FriendRequestDto) {
    return this.friendsService.sendRequest(req.user.id, dto.targetUserId);
  }

  @Post('requests/:requestId/accept')
  accept(@Request() req: any, @Param('requestId') requestId: string) {
    return this.friendsService.respondToRequest(req.user.id, requestId, true);
  }

  @Post('requests/:requestId/decline')
  decline(@Request() req: any, @Param('requestId') requestId: string) {
    return this.friendsService.respondToRequest(req.user.id, requestId, false);
  }

  @Delete(':friendId')
  remove(@Request() req: any, @Param('friendId') friendId: string) {
    return this.friendsService.removeFriend(req.user.id, friendId);
  }

  @Post(':userId/block')
  block(@Request() req: any, @Param('userId') userId: string) {
    return this.friendsService.block(req.user.id, userId);
  }

  @Post(':userId/unblock')
  unblock(@Request() req: any, @Param('userId') userId: string) {
    return this.friendsService.unblock(req.user.id, userId);
  }
}
