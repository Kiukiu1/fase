import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CONTACTED_CARE_DAYS, NO_ANSWER_GIVE_UP_CALLS } from 'src/constants';
import { BusinessHoursService } from '../business-hours/business-hours.service';
import { CallResult, LeadStatus, NotificationType } from '../enums';
import { NotificationBean } from '../notification/notification.bean';
import { Users } from '../user/entity/user.entity';
import { CallLogs } from './entity/call-log.entity';
import { Leads } from './entity/lead.entity';
import { LeadStatusBean } from './lead-status.bean';
import {
  ACTIVE_CARE_STATUSES,
  assertSalesTransition,
  isTerminal,
  planCall,
} from './lead-status.rules';

export interface LogCallInput {
  result: CallResult;
  durationMinutes?: number | null;
  note?: string | null;
  status?: LeadStatus | null;
  reason?: string | null;
}

const GIVE_UP_NO_ANSWER_REASON = `Đã gọi đủ ${NO_ANSWER_GIVE_UP_CALLS} ngày, khách vẫn không nghe máy`;
const GIVE_UP_CONTACTED_REASON = `Quá ${CONTACTED_CARE_DAYS} ngày kể từ lúc nhận mà chưa tiến triển`;

@Injectable()
export class LeadCareBean {
  constructor(
    private readonly dataSource: DataSource,
    private readonly statusBean: LeadStatusBean,
    private readonly notificationBean: NotificationBean,
    private readonly businessHours: BusinessHoursService,
  ) {}

  /** BR-05: chỉ nhân viên đang được phân mới được cập nhật LEAD. */
  private async lockOwnLead(manager: EntityManager, sales: Users, leadId: number) {
    const lead = await manager
      .getRepository(Leads)
      .createQueryBuilder('lead')
      .setLock('pessimistic_write')
      .where('lead.id = :leadId', { leadId })
      .getOne();
    if (!lead || lead.managerId !== sales.managerId) {
      throw new NotFoundException('Không tìm thấy LEAD');
    }
    if (lead.assignedToId !== sales.id) {
      throw new ForbiddenException('Chỉ nhân viên đang được phân LEAD mới được cập nhật LEAD này');
    }
    return lead;
  }

  /** FR-SAL-03: nhập tay kết quả cuộc gọi, có thể kèm đổi trạng thái. */
  async logCall(sales: Users, leadId: number, input: LogCallInput) {
    return this.dataSource.transaction(async (manager) => {
      const lead = await this.lockOwnLead(manager, sales, leadId);
      const now = this.businessHours.now();
      const plan = planCall({
        status: lead.status,
        noAnswerCount: lead.noAnswerCount,
        lastNoAnswerDate: lead.lastNoAnswerDate,
        result: input.result,
        requestedStatus: input.status,
        reason: input.reason,
        today: this.businessHours.todayKey(now),
      });

      await manager.getRepository(CallLogs).insert({
        leadId: lead.id,
        userId: sales.id,
        calledAt: now,
        result: input.result,
        durationMinutes: input.durationMinutes ?? null,
        note: input.note?.trim() || null,
        countedNoAnswer: plan.counted,
      });

      const counters: Partial<Leads> = {
        noAnswerCount: plan.noAnswerCount,
        lastNoAnswerDate: plan.lastNoAnswerDate,
        lastCallAt: now,
        callCount: lead.callCount + 1,
      };
      if (plan.nextStatus) {
        await this.statusBean.transition(
          manager,
          lead,
          plan.nextStatus,
          sales.id,
          input.reason?.trim() || input.note,
          isTerminal(plan.nextStatus) ? { ...counters, nextCallbackAt: null } : counters,
        );
      } else {
        Object.assign(lead, counters);
        await manager.getRepository(Leads).update(lead.id, counters);
      }

      if (plan.autoGiveUp) {
        await this.statusBean.transition(
          manager,
          lead,
          LeadStatus.NO_ANSWER_GIVE_UP,
          null,
          GIVE_UP_NO_ANSWER_REASON,
          { nextCallbackAt: null },
        );
        await this.notificationBean.notify(
          [
            {
              userId: sales.id,
              type: NotificationType.AUTO_GIVE_UP,
              content: `LEAD ${lead.phone} đã chuyển "Không nghe máy / Từ bỏ" sau ${NO_ANSWER_GIVE_UP_CALLS} ngày gọi`,
              leadId: lead.id,
            },
          ],
          manager,
        );
      }
      return { lead, counted: plan.counted, autoGiveUp: plan.autoGiveUp };
    });
  }

  /** Đổi trạng thái không kèm cuộc gọi (vd. đã gửi báo giá qua email). */
  async changeStatus(sales: Users, leadId: number, status: LeadStatus, reason?: string | null) {
    return this.dataSource.transaction(async (manager) => {
      const lead = await this.lockOwnLead(manager, sales, leadId);
      if (lead.status === LeadStatus.RECEIVED || lead.status === LeadStatus.NO_ANSWER_RETRY) {
        if (status === LeadStatus.NO_ANSWER_RETRY) {
          throw new BadRequestException('Hãy ghi cuộc gọi "Không nghe máy" để hệ thống đếm x/7');
        }
      }
      assertSalesTransition(lead.status, status, reason);
      return this.statusBean.transition(
        manager,
        lead,
        status,
        sales.id,
        reason,
        isTerminal(status) ? { nextCallbackAt: null } : {},
      );
    });
  }

  /** FR-SAL-04: đặt / huỷ lịch gọi lại. */
  async setCallback(sales: Users, leadId: number, callbackAt: Date | null) {
    return this.dataSource.transaction(async (manager) => {
      const lead = await this.lockOwnLead(manager, sales, leadId);
      if (!ACTIVE_CARE_STATUSES.includes(lead.status)) {
        throw new BadRequestException('Chỉ đặt lịch gọi lại cho LEAD đang chăm sóc');
      }
      if (callbackAt && callbackAt.getTime() <= Date.now()) {
        throw new BadRequestException('Thời gian gọi lại phải ở tương lai');
      }
      const changes = { nextCallbackAt: callbackAt, callbackNotified: false };
      await manager.getRepository(Leads).update(lead.id, changes);
      return Object.assign(lead, changes);
    });
  }

  /** BR-03: "Đã liên hệ" quá 7 ngày kể từ lúc nhận -> "Không nghe máy / Từ bỏ". */
  async giveUpStaleContacted() {
    return this.dataSource.transaction(async (manager) => {
      const [rows] = (await manager.query(
        `WITH stale AS (
           SELECT id FROM "lead"
           WHERE status = $1 AND received_at <= now() - make_interval(days => $3)
           ORDER BY id LIMIT 1000
           FOR UPDATE SKIP LOCKED
         )
         UPDATE "lead" l SET status = $2, next_callback_at = NULL, date_modified = now()
         FROM stale s
         WHERE l.id = s.id AND l.status = $1
         RETURNING l.id, l.assigned_to_id AS sales_id, l.phone`,
        [LeadStatus.CONTACTED, LeadStatus.NO_ANSWER_GIVE_UP, CONTACTED_CARE_DAYS],
      )) as [{ id: number; sales_id: string | null; phone: string }[], number];
      if (!rows.length) return 0;
      await this.statusBean.record(
        manager,
        rows.map((row) => ({
          leadId: row.id,
          fromStatus: LeadStatus.CONTACTED,
          toStatus: LeadStatus.NO_ANSWER_GIVE_UP,
          actorId: null,
          reason: GIVE_UP_CONTACTED_REASON,
        })),
      );
      await this.notificationBean.notify(
        rows
          .filter((row) => row.sales_id)
          .map((row) => ({
            userId: row.sales_id!,
            type: NotificationType.AUTO_GIVE_UP,
            content: `LEAD ${row.phone} đã chuyển "Không nghe máy / Từ bỏ": ${GIVE_UP_CONTACTED_REASON.toLowerCase()}`,
            leadId: row.id,
          })),
        manager,
      );
      return rows.length;
    });
  }

  /** Báo cho nhân viên khi đến giờ gọi lại đã hẹn. */
  async notifyDueCallbacks() {
    return this.dataSource.transaction(async (manager) => {
      const [rows] = (await manager.query(
        `UPDATE "lead" SET callback_notified = true
         WHERE next_callback_at <= now() AND callback_notified = false
           AND assigned_to_id IS NOT NULL AND status = ANY($1)
         RETURNING id, assigned_to_id AS sales_id, phone`,
        [ACTIVE_CARE_STATUSES],
      )) as [{ id: number; sales_id: string; phone: string }[], number];
      await this.notificationBean.notify(
        rows.map((row) => ({
          userId: row.sales_id,
          type: NotificationType.CALLBACK_DUE,
          content: `Đến giờ gọi lại LEAD ${row.phone}`,
          leadId: row.id,
        })),
        manager,
      );
      return rows.length;
    });
  }
}
