import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Message } from 'src/entities/message.entity';
import { GlobalChatMessage } from 'src/entities/global-chat-message.entity';
import { User } from 'src/entities/user.entity';
import { FriendsService } from '../friends/friends.service';

@Injectable()
export class ChatService {
  private readonly globalMessageRetention = 5000;

  constructor(
    @InjectRepository(Message)
    private messagesRepo: Repository<Message>,
    @InjectRepository(GlobalChatMessage)
    private globalMessagesRepo: Repository<GlobalChatMessage>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private friendsService: FriendsService,
  ) {}

  async getDisplayName(userId: string): Promise<string> {
    const user = await this.usersRepo.findOne({ where: { id: userId }, select: ['username'] });
    return user?.username ?? userId;
  }

  async getGlobalMessages(limit = this.globalMessageRetention) {
    const messages = await this.globalMessagesRepo.find({
      order: { createdAt: 'DESC' },
      take: Math.min(limit, this.globalMessageRetention),
    });

    return messages.reverse();
  }

  async saveGlobalMessage(authorId: string, content: string): Promise<GlobalChatMessage> {
    const message = this.globalMessagesRepo.create({ authorId, content: content.trim() });
    const saved = await this.globalMessagesRepo.save(message);
    await this.trimGlobalMessages();
    return saved;
  }

  private async trimGlobalMessages(): Promise<void> {
    const overflow = (await this.globalMessagesRepo.count()) - this.globalMessageRetention;
    if (overflow <= 0) return;

    const oldestMessages = await this.globalMessagesRepo.find({
      select: ['id'],
      order: { createdAt: 'ASC' },
      take: overflow,
    });

    if (oldestMessages.length === 0) return;

    await this.globalMessagesRepo.delete(oldestMessages.map((message) => message.id));
  }

  async sendMessage(senderId: string, receiverId: string, content: string): Promise<Message> {
    if (senderId === receiverId) {
      throw new ForbiddenException("You can't message yourself");
    }

    const receiver = await this.usersRepo.findOne({ where: { id: receiverId } });
    if (!receiver) throw new NotFoundException('User not found');

    // block check is bidirectional: neither side should be able to reach the other
    const blocked = await this.friendsService.isBlocked(senderId, receiverId);
    if (blocked) {
      throw new ForbiddenException('You cannot message this user');
    }

    const message = this.messagesRepo.create({ senderId, receiverId, content: content.trim() });
    return this.messagesRepo.save(message);
  }

  /** Paginated history between two users, newest first. Pass `before` (a message id's createdAt ISO string) to page further back. */
  async getConversation(userId: string, otherUserId: string, limit = 50, before?: string) {
    const qb = this.messagesRepo
      .createQueryBuilder('m')
      .where(
        '((m.senderId = :userId AND m.receiverId = :otherUserId) OR (m.senderId = :otherUserId AND m.receiverId = :userId))',
        { userId, otherUserId },
      )
      .orderBy('m.createdAt', 'DESC')
      .take(Math.min(limit, 100));

    if (before) {
      qb.andWhere('m.createdAt < :before', { before: new Date(before) });
    }

    const messages = await qb.getMany();
    return messages.reverse(); // chronological order for the client
  }

  /** One row per friend/contact with their most recent message, for a DM inbox list. */
  async listConversations(userId: string) {
    const messages = await this.messagesRepo
      .createQueryBuilder('m')
      .where('m.senderId = :userId OR m.receiverId = :userId', { userId })
      .orderBy('m.createdAt', 'DESC')
      .getMany();

    const seen = new Set<string>();
    const previews: { otherUserId: string; lastMessage: Message }[] = [];
    for (const m of messages) {
      const otherUserId = m.senderId === userId ? m.receiverId : m.senderId;
      if (seen.has(otherUserId)) continue;
      seen.add(otherUserId);
      previews.push({ otherUserId, lastMessage: m });
    }
    return previews;
  }

  async markAsRead(userId: string, otherUserId: string) {
    await this.messagesRepo.update(
      { senderId: otherUserId, receiverId: userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { status: 'ok' };
  }

  async getUnreadCount(userId: string) {
    return this.messagesRepo.count({ where: { receiverId: userId, readAt: IsNull() } });
  }
}
