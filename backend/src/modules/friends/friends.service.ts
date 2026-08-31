import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friendship, FriendshipStatus } from 'src/entities/friendship.entity';
import { User } from 'src/entities/user.entity';
import { PresenceService } from '../presence/presence.service';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friendship)
    private friendshipRepo: Repository<Friendship>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private presenceService: PresenceService,
  ) {}

  private async findRelationship(userA: string, userB: string): Promise<Friendship | null> {
    // relationship rows are directional, so check both directions
    return this.friendshipRepo
      .createQueryBuilder('f')
      .where(
        '(f.requesterId = :userA AND f.addresseeId = :userB) OR (f.requesterId = :userB AND f.addresseeId = :userA)',
        { userA, userB },
      )
      .getOne();
  }

  async isBlocked(userA: string, userB: string): Promise<boolean> {
    const rel = await this.findRelationship(userA, userB);
    return !!rel && rel.status === FriendshipStatus.BLOCKED;
  }

  async areFriends(userA: string, userB: string): Promise<boolean> {
    const rel = await this.findRelationship(userA, userB);
    return !!rel && rel.status === FriendshipStatus.ACCEPTED;
  }

  async sendRequest(requesterId: string, targetUserId: string) {
    if (requesterId === targetUserId) {
      throw new BadRequestException("You can't add yourself as a friend");
    }

    const target = await this.usersRepo.findOne({ where: { id: targetUserId } });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.findRelationship(requesterId, targetUserId);
    if (existing) {
      if (existing.status === FriendshipStatus.BLOCKED) {
        throw new ForbiddenException('Unable to send friend request');
      }
      if (existing.status === FriendshipStatus.ACCEPTED) {
        throw new BadRequestException('You are already friends');
      }
      throw new BadRequestException('A friend request already exists between you two');
    }

    const friendship = this.friendshipRepo.create({
      requesterId,
      addresseeId: targetUserId,
      status: FriendshipStatus.PENDING,
    });
    return this.friendshipRepo.save(friendship);
  }

  async respondToRequest(userId: string, requestId: string, accept: boolean) {
    const request = await this.friendshipRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Friend request not found');
    if (request.addresseeId !== userId) {
      throw new ForbiddenException('This request is not addressed to you');
    }
    if (request.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException('This request has already been handled');
    }

    if (!accept) {
      await this.friendshipRepo.remove(request);
      return { status: 'declined' };
    }

    request.status = FriendshipStatus.ACCEPTED;
    return this.friendshipRepo.save(request);
  }

  async removeFriend(userId: string, otherUserId: string) {
    const rel = await this.findRelationship(userId, otherUserId);
    if (!rel || rel.status !== FriendshipStatus.ACCEPTED) {
      throw new NotFoundException('Friendship not found');
    }
    await this.friendshipRepo.remove(rel);
    return { status: 'removed' };
  }

  async block(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException("You can't block yourself");
    }
    const target = await this.usersRepo.findOne({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('User not found');

    const existing = await this.findRelationship(userId, targetUserId);
    if (existing) {
      await this.friendshipRepo.remove(existing);
    }

    const block = this.friendshipRepo.create({
      requesterId: userId,
      addresseeId: targetUserId,
      status: FriendshipStatus.BLOCKED,
    });
    return this.friendshipRepo.save(block);
  }

  async unblock(userId: string, targetUserId: string) {
    const rel = await this.friendshipRepo.findOne({
      where: { requesterId: userId, addresseeId: targetUserId, status: FriendshipStatus.BLOCKED },
    });
    if (!rel) throw new NotFoundException('No block found');
    await this.friendshipRepo.remove(rel);
    return { status: 'unblocked' };
  }

  async listFriends(userId: string) {
    const rels = await this.friendshipRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.requester', 'requester')
      .leftJoinAndSelect('f.addressee', 'addressee')
      .where('(f.requesterId = :userId OR f.addresseeId = :userId) AND f.status = :status', {
        userId,
        status: FriendshipStatus.ACCEPTED,
      })
      .getMany();

    return rels.map((rel) => {
      const friend = rel.requesterId === userId ? rel.addressee : rel.requester;
      return {
        friendshipId: rel.id,
        id: friend.id,
        username: friend.username,
        avatar: friend.avatar,
        online: this.presenceService.isOnline(friend.id),
        since: rel.updatedAt,
      };
    });
  }

  async listIncomingRequests(userId: string) {
    const rels = await this.friendshipRepo.find({
      where: { addresseeId: userId, status: FriendshipStatus.PENDING },
      relations: ['requester'],
    });
    return rels.map((r) => ({
      requestId: r.id,
      from: { id: r.requester.id, username: r.requester.username, avatar: r.requester.avatar },
      createdAt: r.createdAt,
    }));
  }

  async listOutgoingRequests(userId: string) {
    const rels = await this.friendshipRepo.find({
      where: { requesterId: userId, status: FriendshipStatus.PENDING },
      relations: ['addressee'],
    });
    return rels.map((r) => ({
      requestId: r.id,
      to: { id: r.addressee.id, username: r.addressee.username, avatar: r.addressee.avatar },
      createdAt: r.createdAt,
    }));
  }

  async listBlocked(userId: string) {
    const rels = await this.friendshipRepo.find({
      where: { requesterId: userId, status: FriendshipStatus.BLOCKED },
      relations: ['addressee'],
    });
    return rels.map((r) => ({
      id: r.addressee.id,
      username: r.addressee.username,
    }));
  }

  /** All accepted friend ids for a user — used by the chat gateway to broadcast presence. */
  async getFriendIds(userId: string): Promise<string[]> {
    const rels = await this.friendshipRepo.find({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
      ],
    });
    return rels.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
  }
}
