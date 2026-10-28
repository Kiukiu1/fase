import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { LeadStatus } from '../enums';
import { Leads } from './entity/lead.entity';
import { LeadStatusHistory } from './entity/lead-status-history.entity';

export interface StatusChange {
  leadId: number;
  fromStatus: LeadStatus;
  toStatus: LeadStatus;
  /** null = hệ thống tự chuyển */
  actorId: string | null;
  reason?: string | null;
}

/**
 * BR-04: mọi thay đổi `lead.status` đều đi qua bean này để luôn có lịch sử.
 * Luôn gọi bên trong transaction của nghiệp vụ.
 */
@Injectable()
export class LeadStatusBean {
  /** Đổi trạng thái một LEAD đã được load (và đã khoá) trong transaction. */
  async transition(
    manager: EntityManager,
    lead: Leads,
    toStatus: LeadStatus,
    actorId: string | null,
    reason?: string | null,
    extra: Partial<Leads> = {},
  ) {
    const fromStatus = lead.status;
    Object.assign(lead, extra, { status: toStatus });
    await manager.getRepository(Leads).update(lead.id, { ...extra, status: toStatus });
    if (fromStatus !== toStatus) {
      await this.record(manager, [
        { leadId: lead.id, fromStatus, toStatus, actorId, reason },
      ]);
    }
    return lead;
  }

  /** Ghi lịch sử cho các thay đổi đã thực hiện bằng câu UPDATE hàng loạt. */
  async record(manager: EntityManager, changes: StatusChange[]) {
    const real = changes.filter((change) => change.fromStatus !== change.toStatus);
    if (!real.length) return;
    await manager.getRepository(LeadStatusHistory).insert(
      real.map((change) => ({
        leadId: change.leadId,
        fromStatus: change.fromStatus,
        toStatus: change.toStatus,
        actorId: change.actorId,
        reason: change.reason?.trim() || null,
      })),
    );
  }
}
