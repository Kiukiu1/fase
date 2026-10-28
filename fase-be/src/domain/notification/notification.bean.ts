import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { NotificationType } from '../enums';
import { offsetOf } from '../paging';
import { Notifications } from './entity/notification.entity';

export interface NewNotification {
  userId: string;
  type: NotificationType;
  content: string;
  leadId?: number | null;
}

const LIST_SIZE = 20;

@Injectable()
export class NotificationBean {
  constructor(
    @InjectRepository(Notifications)
    private readonly notificationRepository: Repository<Notifications>,
  ) {}

  /** Ghi thông báo; truyền `manager` để nằm chung transaction với nghiệp vụ. */
  async notify(items: NewNotification[], manager?: EntityManager) {
    if (!items.length) return;
    const repository = manager
      ? manager.getRepository(Notifications)
      : this.notificationRepository;
    await repository.insert(
      items.map((item) => ({ ...item, leadId: item.leadId ?? null })),
    );
  }

  async list(userId: string, page = 1) {
    const [items, total] = await this.notificationRepository.findAndCount({
      where: { userId },
      order: { dateCreated: 'DESC' },
      skip: offsetOf(page, LIST_SIZE),
      take: LIST_SIZE,
    });
    return { items, total, page, pageSize: LIST_SIZE };
  }

  unreadCount(userId: string) {
    return this.notificationRepository.count({
      where: { userId, readAt: IsNull() },
    });
  }

  async markRead(userId: string, id: number) {
    await this.notificationRepository.update(
      { id, userId, readAt: IsNull() },
      { readAt: new Date() },
    );
  }

  async markAllRead(userId: string) {
    await this.notificationRepository.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );
  }
}
