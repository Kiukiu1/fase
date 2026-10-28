import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import {
  RECEIVE_LIMIT_MINUTES,
  RECEIVE_WARNING_MINUTES,
} from 'src/constants';
import { BusinessHoursService } from '../business-hours/business-hours.service';
import {
  AssignmentAction,
  LeadStatus,
  NotificationType,
} from '../enums';
import { NewNotification, NotificationBean } from '../notification/notification.bean';
import { Users } from '../user/entity/user.entity';
import { UserBean } from '../user/user.bean';
import { LeadAssignments } from './entity/lead-assignment.entity';
import { Leads } from './entity/lead.entity';
import { MAX_LEADS_PER_ASSIGN, SplitMode, splitLeads } from './lead-assignment.rules';
import { LeadStatusBean, StatusChange } from './lead-status.bean';
import {
  ACTIVE_CARE_STATUSES,
  REOPENABLE_STATUSES,
  STATUS_LABELS,
} from './lead-status.rules';

export interface AssignInput {
  leadIds: number[];
  salesIds: string[];
  mode: SplitMode;
  counts?: Record<string, number>;
  /** Cho phép phân lại LEAD đang được phân / đã kết thúc (FR-CRM-05). */
  reassign?: boolean;
}

/** Các cột trả về trạng thái "nằm trong kho" và xoá dữ liệu của lượt chăm sóc trước. */
const BACK_TO_POOL: Partial<Leads> = {
  status: LeadStatus.NEW,
  assignedToId: null,
  assignedAt: null,
  receiveDeadline: null,
  receiveWarned: false,
  receivedAt: null,
  noAnswerCount: 0,
  lastNoAnswerDate: null,
  nextCallbackAt: null,
  callbackNotified: false,
};

const REVOCABLE_STATUSES = [LeadStatus.ASSIGNED, ...ACTIVE_CARE_STATUSES];
const RETURN_REASON = `Quá ${RECEIVE_LIMIT_MINUTES / 60} giờ (giờ hành chính) không nhận`;

interface ExpiredRow {
  id: number;
  sales_id: string;
  manager_id: string;
  phone: string;
}

@Injectable()
export class LeadAssignmentBean {
  constructor(
    private readonly dataSource: DataSource,
    private readonly userBean: UserBean,
    private readonly statusBean: LeadStatusBean,
    private readonly notificationBean: NotificationBean,
    private readonly businessHours: BusinessHoursService,
  ) {}

  /** Khoá các LEAD của kho trưởng phòng trong transaction, báo lỗi nếu thiếu. */
  private async lockManagerLeads(
    manager: EntityManager,
    managerId: string,
    leadIds: number[],
  ) {
    const ids = [...new Set(leadIds.map(Number).filter(Number.isInteger))];
    if (!ids.length) throw new BadRequestException('Cần chọn ít nhất một LEAD');
    if (ids.length > MAX_LEADS_PER_ASSIGN) {
      throw new BadRequestException(`Mỗi lần chỉ thao tác tối đa ${MAX_LEADS_PER_ASSIGN} LEAD`);
    }
    const leads = await manager
      .getRepository(Leads)
      .createQueryBuilder('lead')
      .setLock('pessimistic_write')
      .where('lead.id IN (:...ids)', { ids })
      .andWhere('lead.managerId = :managerId', { managerId })
      .orderBy('lead.id', 'ASC')
      .getMany();
    if (leads.length !== ids.length) {
      throw new NotFoundException('Có LEAD không thuộc kho của bạn');
    }
    return leads;
  }

  private logAssignments(
    manager: EntityManager,
    rows: { leadId: number; userId: string | null; action: AssignmentAction; actorId: string | null }[],
  ) {
    if (!rows.length) return;
    return manager.getRepository(LeadAssignments).insert(rows);
  }

  /** FR-CRM-04 / FR-CRM-05: phân (hoặc phân lại) LEAD cho nhân viên. */
  async assign(managerUser: Users, input: AssignInput) {
    const sales = await this.userBean.findSalesOfManagerByIds(
      managerUser.id,
      input.salesIds,
    );
    const now = this.businessHours.now();
    const deadline = this.businessHours.deadlineFrom(now, RECEIVE_LIMIT_MINUTES);

    return this.dataSource.transaction(async (manager) => {
      const leads = await this.lockManagerLeads(manager, managerUser.id, input.leadIds);
      for (const lead of leads) {
        const inPool = lead.status === LeadStatus.NEW && !lead.assignedToId;
        if (inPool) continue;
        if (!input.reassign) {
          throw new ConflictException(
            `LEAD ${lead.phone} không còn trong kho (đang "${STATUS_LABELS[lead.status]}"), vui lòng tải lại trang`,
          );
        }
        if (lead.status === LeadStatus.WON) {
          throw new BadRequestException(`LEAD ${lead.phone} đã chốt, không thể phân lại`);
        }
      }

      const plan = splitLeads(
        leads.map((lead) => lead.id),
        sales.map((user) => user.id),
        input.mode,
        input.counts,
      );
      const leadById = new Map(leads.map((lead) => [lead.id, lead]));
      const changes: StatusChange[] = [];
      const assignments: Parameters<LeadAssignmentBean['logAssignments']>[1] = [];
      const notifications: NewNotification[] = [];

      for (const lead of leads) {
        if (!lead.assignedToId) continue;
        const reopened = REOPENABLE_STATUSES.includes(lead.status);
        assignments.push({
          leadId: lead.id,
          userId: lead.assignedToId,
          action: reopened ? AssignmentAction.REOPEN : AssignmentAction.REVOKE,
          actorId: managerUser.id,
        });
        if (reopened) continue;
        notifications.push({
          userId: lead.assignedToId,
          type: NotificationType.LEAD_REVOKED,
          content: `LEAD ${lead.phone} đã được trưởng phòng phân lại cho người khác`,
          leadId: lead.id,
        });
      }

      for (const user of sales) {
        const ids = plan.get(user.id)!;
        if (!ids.length) continue;
        await manager.getRepository(Leads).update(
          { id: In(ids) },
          {
            ...BACK_TO_POOL,
            status: LeadStatus.ASSIGNED,
            assignedToId: user.id,
            assignedAt: now,
            receiveDeadline: deadline,
          },
        );
        for (const id of ids) {
          const lead = leadById.get(id)!;
          changes.push({
            leadId: id,
            fromStatus: lead.status,
            toStatus: LeadStatus.ASSIGNED,
            actorId: managerUser.id,
            reason: `Phân cho ${user.fullName}`,
          });
          assignments.push({ leadId: id, userId: user.id, action: AssignmentAction.ASSIGN, actorId: managerUser.id });
        }
        notifications.push({
          userId: user.id,
          type: NotificationType.LEAD_ASSIGNED,
          content: `Bạn được phân ${ids.length} LEAD mới, hạn nhận trước ${this.businessHours.format(deadline)}`,
          leadId: ids.length === 1 ? ids[0] : null,
        });
      }
      // Phân lại LEAD đang "Chờ nhận" không đổi trạng thái: lịch sử phân (REVOKE + ASSIGN) đã ghi đủ.
      await this.statusBean.record(manager, changes);
      await this.logAssignments(manager, assignments);
      await this.notificationBean.notify(notifications, manager);

      return {
        total: leads.length,
        deadline,
        perSales: sales.map((user) => ({ user, count: plan.get(user.id)!.length })),
      };
    });
  }

  /** FR-CRM-05: thu hồi LEAD đang phân về kho. */
  async revoke(managerUser: Users, leadIds: number[]) {
    return this.dataSource.transaction(async (manager) => {
      const leads = await this.lockManagerLeads(manager, managerUser.id, leadIds);
      for (const lead of leads) {
        if (!lead.assignedToId || !REVOCABLE_STATUSES.includes(lead.status)) {
          throw new BadRequestException(
            `LEAD ${lead.phone} đang "${STATUS_LABELS[lead.status]}", không thể thu hồi`,
          );
        }
      }
      await manager.getRepository(Leads).update(
        { id: In(leads.map((lead) => lead.id)) },
        BACK_TO_POOL,
      );
      await this.statusBean.record(
        manager,
        leads.map((lead) => ({
          leadId: lead.id,
          fromStatus: lead.status,
          toStatus: LeadStatus.NEW,
          actorId: managerUser.id,
          reason: 'Trưởng phòng thu hồi về kho',
        })),
      );
      await this.logAssignments(
        manager,
        leads.map((lead) => ({
          leadId: lead.id,
          userId: lead.assignedToId,
          action: AssignmentAction.REVOKE,
          actorId: managerUser.id,
        })),
      );
      await this.notificationBean.notify(
        leads.map((lead) => ({
          userId: lead.assignedToId!,
          type: NotificationType.LEAD_REVOKED,
          content: `LEAD ${lead.phone} đã bị trưởng phòng thu hồi về kho`,
          leadId: lead.id,
        })),
        manager,
      );
      return leads.length;
    });
  }

  /** BR-08: mở lại LEAD ở trạng thái kết thúc, đưa về kho để phân lại. */
  async reopen(managerUser: Users, leadIds: number[]) {
    return this.dataSource.transaction(async (manager) => {
      const leads = await this.lockManagerLeads(manager, managerUser.id, leadIds);
      for (const lead of leads) {
        if (!REOPENABLE_STATUSES.includes(lead.status)) {
          throw new BadRequestException(
            `LEAD ${lead.phone} đang "${STATUS_LABELS[lead.status]}", không thể mở lại`,
          );
        }
      }
      await manager.getRepository(Leads).update(
        { id: In(leads.map((lead) => lead.id)) },
        BACK_TO_POOL,
      );
      await this.statusBean.record(
        manager,
        leads.map((lead) => ({
          leadId: lead.id,
          fromStatus: lead.status,
          toStatus: LeadStatus.NEW,
          actorId: managerUser.id,
          reason: 'Trưởng phòng mở lại LEAD',
        })),
      );
      await this.logAssignments(
        manager,
        leads.map((lead) => ({
          leadId: lead.id,
          userId: lead.assignedToId,
          action: AssignmentAction.REOPEN,
          actorId: managerUser.id,
        })),
      );
      return leads.length;
    });
  }

  /** FR-SAL-02: nhận LEAD = bắt đầu gọi ngay. */
  async receive(sales: Users, leadId: number) {
    return this.dataSource.transaction(async (manager) => {
      const lead = await manager
        .getRepository(Leads)
        .createQueryBuilder('lead')
        .setLock('pessimistic_write')
        .where('lead.id = :leadId', { leadId })
        .andWhere('lead.assignedToId = :salesId', { salesId: sales.id })
        .getOne();
      if (!lead) throw new NotFoundException('Không tìm thấy LEAD được phân cho bạn');
      if (lead.status !== LeadStatus.ASSIGNED) {
        throw new ConflictException('LEAD này đã được nhận rồi');
      }
      const now = this.businessHours.now();
      if (!lead.receiveDeadline || lead.receiveDeadline <= now) {
        throw new ConflictException('Đã quá hạn nhận, LEAD sẽ được trả về kho');
      }
      await this.statusBean.transition(manager, lead, LeadStatus.RECEIVED, sales.id, null, {
        receivedAt: now,
      });
      await this.logAssignments(manager, [
        { leadId: lead.id, userId: sales.id, action: AssignmentAction.RECEIVE, actorId: sales.id },
      ]);
      return lead;
    });
  }

  /**
   * BR-01: trả về kho các LEAD quá hạn nhận. Điều kiện nằm trong câu UPDATE và
   * dùng SKIP LOCKED nên chạy trùng (nhiều instance / lần chạy chồng) không trả 2 lần.
   */
  async returnExpired() {
    return this.dataSource.transaction(async (manager) => {
      const [rows] = (await manager.query(
        `WITH expired AS (
           SELECT id, assigned_to_id, manager_id FROM "lead"
           WHERE status = $1 AND receive_deadline <= now()
           ORDER BY id LIMIT 1000
           FOR UPDATE SKIP LOCKED
         )
         UPDATE "lead" l SET status = $2, assigned_to_id = NULL, assigned_at = NULL,
           receive_deadline = NULL, receive_warned = false, date_modified = now()
         FROM expired e
         WHERE l.id = e.id AND l.status = $1
         RETURNING l.id, e.assigned_to_id AS sales_id, e.manager_id, l.phone`,
        [LeadStatus.ASSIGNED, LeadStatus.NEW],
      )) as [ExpiredRow[], number];
      if (!rows.length) return 0;

      await this.statusBean.record(
        manager,
        rows.map((row) => ({
          leadId: row.id,
          fromStatus: LeadStatus.ASSIGNED,
          toStatus: LeadStatus.NEW,
          actorId: null,
          reason: RETURN_REASON,
        })),
      );
      await this.logAssignments(
        manager,
        rows.map((row) => ({
          leadId: row.id,
          userId: row.sales_id,
          action: AssignmentAction.AUTO_RETURN,
          actorId: null,
        })),
      );
      const countByManager = new Map<string, number>();
      rows.forEach((row) =>
        countByManager.set(row.manager_id, (countByManager.get(row.manager_id) ?? 0) + 1),
      );
      await this.notificationBean.notify(
        [
          ...rows.map((row) => ({
            userId: row.sales_id,
            type: NotificationType.LEAD_RETURNED,
            content: `LEAD ${row.phone} đã bị trả về kho vì quá hạn nhận`,
            leadId: row.id,
          })),
          ...[...countByManager].map(([managerId, count]) => ({
            userId: managerId,
            type: NotificationType.LEAD_RETURNED,
            content: `${count} LEAD bị trả về kho do nhân viên không nhận đúng hạn`,
          })),
        ],
        manager,
      );
      return rows.length;
    });
  }

  /** Nhắc nhân viên khi LEAD còn ≤ 30 phút giờ hành chính để nhận. */
  async warnExpiring() {
    const candidates = await this.dataSource.getRepository(Leads).find({
      select: { id: true, receiveDeadline: true },
      where: { status: LeadStatus.ASSIGNED, receiveWarned: false },
      take: 5000,
    });
    const now = this.businessHours.now();
    const dueIds = candidates
      .filter((lead) => {
        if (!lead.receiveDeadline) return false;
        const left = this.businessHours.remainingMinutes(lead.receiveDeadline, now);
        return left > 0 && left <= RECEIVE_WARNING_MINUTES;
      })
      .map((lead) => lead.id);
    if (!dueIds.length) return 0;

    return this.dataSource.transaction(async (manager) => {
      const [rows] = (await manager.query(
        `UPDATE "lead" SET receive_warned = true
         WHERE id = ANY($1) AND status = $2 AND receive_warned = false
         RETURNING id, assigned_to_id AS sales_id, phone`,
        [dueIds, LeadStatus.ASSIGNED],
      )) as [{ id: number; sales_id: string; phone: string }[], number];
      await this.notificationBean.notify(
        rows.map((row) => ({
          userId: row.sales_id,
          type: NotificationType.RECEIVE_EXPIRING,
          content: `LEAD ${row.phone} sắp hết hạn nhận (còn dưới ${RECEIVE_WARNING_MINUTES} phút)`,
          leadId: row.id,
        })),
        manager,
      );
      return rows.length;
    });
  }
}
