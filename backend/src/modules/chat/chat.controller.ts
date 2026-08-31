import { Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  listConversations(@Request() req: any) {
    return this.chatService.listConversations(req.user.id);
  }

  @Get('conversations/:otherUserId/messages')
  getHistory(
    @Request() req: any,
    @Param('otherUserId') otherUserId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.chatService.getConversation(
      req.user.id,
      otherUserId,
      limit ? parseInt(limit, 10) : 50,
      before,
    );
  }

  @Post('conversations/:otherUserId/read')
  markAsRead(@Request() req: any, @Param('otherUserId') otherUserId: string) {
    return this.chatService.markAsRead(req.user.id, otherUserId);
  }

  @Get('unread-count')
  unreadCount(@Request() req: any) {
    return this.chatService.getUnreadCount(req.user.id);
  }
}
