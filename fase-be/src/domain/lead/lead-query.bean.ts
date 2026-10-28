import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { CONTACTED_CARE_DAYS, NO_ANSWER_GIVE_UP_CALLS } from 'src/constants';
import { BusinessHoursService } from '../business-hours/business-hours.service';
import { AssignmentAction, CallResult, LeadStatus } from '../enums';
import { likeOf, offsetOf, PAGE_SIZE } from '../paging';
import { CallLogs } from './entity/call-log.entity';
import { LeadAssignments } from './entity/lead-assignment.entity';
import { LeadStatusHistory } from './entity/lead-status-history.entity';
import { Leads } from './entity/lead.entity';
import {
  ACTIVE_CARE_STATUSES,
  NO_ANSWER_OUTCOMES,
  SALES_TRANSITIONS,
  STATUS_LABELS,
  TERMINAL_STATUSES,
} from './lead-status.rules';

export interface ManagerLeadFilter {
  keyword?: string;
  status?: LeadStatus;
  /** POOL = đang trong kho (chưa phân), ASSIGNED = đang có người giữ, TERMINAL = đã kết thúc */
  scope?: 'POOL' | 'HELD' | 'TERMINAL';
  servicePackage?: string;
  salesId?: string;
  interestedFrom?: string;
  interestedTo?: string;
}

export enum SalesDue {
  /** Đã đến / quá giờ hẹn gọi lại, hoặc hẹn trong hôm nay */
  CALLBACK = 'CALLBACK',
  /** "Không nghe máy / Gọi tiếp" mà hôm nay chưa gọi */
  NOT_CALLED_TODAY = 'NOT_CALLED_TODAY',
  /** "Đã liên hệ" còn ≤ 2 ngày là hết hạn chăm sóc 7 ngày */
  CARE_EXPIRING = 'CARE_EXPIRING',
}

export interface SalesLeadFilter {
  keyword?: string;
  status?: LeadStatus;
  due?: SalesDue;
}

const CARE_EXPIRING_DAYS_LEFT = 2;
const DAY = 86_400_000;

export interface TimelineItem {
  at: Date;
  kind: 'ASSIGNMENT' | 'CALL' | 'STATUS';
  title: string;
  detail: string | null;
  actorName: string;
}

const ASSIGNMENT_TITLES: Record<AssignmentAction, string> = {
  [AssignmentAction.ASSIGN]: 'Phân LEAD',
  [AssignmentAction.RECEIVE]: 'Nhân viên nhận LEAD',
  [AssignmentAction.AUTO_RETURN]: 'Tự động trả về kho (quá hạn nhận)',
  [AssignmentAction.REVOKE]: 'Thu hồi về kho',
  [AssignmentAction.REOPEN]: 'Mở lại LEAD',
};

@Injectable()
export class LeadQueryBean {
  constructor(
    @InjectRepository(Leads) private readonly leadRepository: Repository<Leads>,
    @InjectRepository(CallLogs) private readonly callLogRepository: Repository<CallLogs>,
    @InjectRepository(LeadStatusHistory)
    private readonly historyRepository: Repository<LeadStatusHistory>,
    @InjectRepository(LeadAssignments)
    private readonly assignmentRepository: Repository<LeadAssignments>,
    private readonly businessHours: BusinessHoursService,
  ) {}

  private applyKeyword(query: SelectQueryBuilder<Leads>, keyword?: string) {
    const text = keyword?.trim();
    if (!text) return;
    query.andWhere(
      new Brackets((where) =>
        where
          .where('lead.mst ILIKE :like', { like: likeOf(text) })
          .orWhere('lead.phone ILIKE :like', { like: likeOf(text.replace(/[\s.]/g, '')) }),
      ),
    );
  }

  /* ---------------------------- Fase-CRM ---------------------------- */

  /** FR-CRM-03: kho LEAD của phòng, lọc + tìm kiếm + phân trang. */
  async searchForManager(managerId: string, filter: ManagerLeadFilter, page: number) {
    const query = this.leadRepository
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.assignedTo', 'assignedTo')
      .where('lead.managerId = :managerId', { managerId })
      .orderBy('lead.dateModified', 'DESC')
      .addOrderBy('lead.id', 'DESC')
      .skip(offsetOf(page))
      .take(PAGE_SIZE);
    this.applyKeyword(query, filter.keyword);
    if (filter.status) query.andWhere('lead.status = :status', { status: filter.status });
    if (filter.scope === 'POOL') query.andWhere('lead.assignedToId IS NULL');
    if (filter.scope === 'HELD') {
      query.andWhere('lead.status IN (:...held)', {
        held: [LeadStatus.ASSIGNED, ...ACTIVE_CARE_STATUSES],
      });
    }
    if (filter.scope === 'TERMINAL') {
      query.andWhere('lead.status IN (:...terminal)', { terminal: TERMINAL_STATUSES });
    }
    if (filter.servicePackage) {
      query.andWhere('lead.servicePackage = :servicePackage', {
        servicePackage: filter.servicePackage,
      });
    }
    if (filter.salesId) query.andWhere('lead.assignedToId = :salesId', { salesId: filter.salesId });
    if (filter.interestedFrom) {
      query.andWhere('lead.interestedDate >= :from', { from: filter.interestedFrom });
    }
    if (filter.interestedTo) {
      query.andWhere('lead.interestedDate <= :to', { to: filter.interestedTo });
    }
    const [leads, total] = await query.getManyAndCount();
    return { leads, total };
  }

  async servicePackagesOf(managerId: string) {
    const rows = await this.leadRepository
      .createQueryBuilder('lead')
      .select('DISTINCT lead.servicePackage', 'servicePackage')
      .where('lead.managerId = :managerId', { managerId })
      .orderBy('lead.servicePackage')
      .getRawMany<{ servicePackage: string }>();
    return rows.map((row) => row.servicePackage);
  }

  async countByStatus(managerId: string) {
    const rows = await this.leadRepository
      .createQueryBuilder('lead')
      .select('lead.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('lead.managerId = :managerId', { managerId })
      .groupBy('lead.status')
      .getRawMany<{ status: LeadStatus; count: string }>();
    const counts = Object.fromEntries(
      Object.values(LeadStatus).map((status) => [status, 0]),
    ) as Record<LeadStatus, number>;
    rows.forEach((row) => (counts[row.status] = Number(row.count)));
    return counts;
  }

  /** Số LEAD từng nhân viên đang giữ theo trạng thái (FR-CRM-06). */
  async countBySalesAndStatus(managerId: string) {
    const rows = await this.leadRepository
      .createQueryBuilder('lead')
      .select('lead.assignedToId', 'salesId')
      .addSelect('lead.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('lead.managerId = :managerId', { managerId })
      .andWhere('lead.assignedToId IS NOT NULL')
      .groupBy('lead.assignedToId')
      .addGroupBy('lead.status')
      .getRawMany<{ salesId: string; status: LeadStatus; count: string }>();
    return rows.map((row) => ({ ...row, count: Number(row.count) }));
  }

  async findForManager(managerId: string, id: number) {
    const lead = await this.leadRepository.findOne({
      where: { id, managerId },
      relations: { assignedTo: true },
    });
    if (!lead) throw new NotFoundException('Không tìm thấy LEAD');
    return lead;
  }

  /** FR-CRM-08 / FR-SAL-07: dòng thời gian phân/nhận, cuộc gọi, đổi trạng thái. */
  async timeline(leadId: number): Promise<TimelineItem[]> {
    const [assignments, calls, histories] = await Promise.all([
      this.assignmentRepository.find({
        where: { leadId },
        relations: { user: true, actor: true },
      }),
      this.callLogRepository.find({ where: { leadId }, relations: { user: true } }),
      this.historyRepository.find({ where: { leadId }, relations: { actor: true } }),
    ]);
    const items: TimelineItem[] = [
      ...assignments.map((row) => ({
        at: row.dateCreated,
        kind: 'ASSIGNMENT' as const,
        title: ASSIGNMENT_TITLES[row.action],
        detail: row.user ? `Nhân viên: ${row.user.fullName}` : null,
        actorName: row.actor?.fullName ?? 'Hệ thống',
      })),
      ...calls.map((row) => ({
        at: row.calledAt,
        kind: 'CALL' as const,
        title:
          row.result === CallResult.ANSWERED
            ? 'Cuộc gọi – khách nghe máy'
            : `Cuộc gọi – không nghe máy${row.countedNoAnswer ? ' (tính vào x/7)' : ''}`,
        detail:
          [row.durationMinutes ? `${row.durationMinutes} phút` : null, row.note]
            .filter(Boolean)
            .join(' · ') || null,
        actorName: row.user.fullName,
      })),
      ...histories.map((row) => ({
        at: row.dateCreated,
        kind: 'STATUS' as const,
        title: `${STATUS_LABELS[row.fromStatus]} → ${STATUS_LABELS[row.toStatus]}`,
        detail: row.reason,
        actorName: row.actor?.fullName ?? 'Hệ thống',
      })),
    ];
    return items.sort((a, b) => b.at.getTime() - a.at.getTime());
  }

  /* ---------------------------- Fase-Sales ---------------------------- */

  /** Hạn chăm sóc 7 ngày của LEAD "Đã liên hệ" (BR-03). */
  careDeadlineOf(lead: Leads) {
    return lead.status === LeadStatus.CONTACTED && lead.receivedAt
      ? new Date(lead.receivedAt.getTime() + CONTACTED_CARE_DAYS * DAY)
      : null;
  }

  toSalesView(lead: Leads) {
    const today = this.businessHours.todayKey();
    return {
      id: lead.id,
      mst: lead.mst,
      phone: lead.phone,
      address: lead.address,
      servicePackage: lead.servicePackage,
      interestedDate: lead.interestedDate,
      status: lead.status,
      statusLabel: STATUS_LABELS[lead.status],
      assignedAt: lead.assignedAt,
      receiveDeadline: lead.receiveDeadline,
      receivedAt: lead.receivedAt,
      noAnswerCount: lead.noAnswerCount,
      noAnswerLimit: NO_ANSWER_GIVE_UP_CALLS,
      calledToday: !!lead.lastCallAt && this.businessHours.dateKey(lead.lastCallAt) === today,
      lastCallAt: lead.lastCallAt,
      callCount: lead.callCount,
      nextCallbackAt: lead.nextCallbackAt,
      careDeadline: this.careDeadlineOf(lead),
    };
  }

  /** FR-SAL-01: LEAD đang chờ nhận kèm đồng hồ đếm ngược (server tính). */
  async pendingForSales(salesId: string) {
    const leads = await this.leadRepository.find({
      where: { assignedToId: salesId, status: LeadStatus.ASSIGNED },
      order: { receiveDeadline: 'ASC', id: 'ASC' },
    });
    const now = this.businessHours.now();
    return leads.map((lead) => ({
      ...this.toSalesView(lead),
      countdown: this.businessHours.countdown(lead.receiveDeadline!, now),
    }));
  }

  /** FR-SAL-05: LEAD đang chăm sóc / đã chăm sóc của nhân viên. */
  async searchForSales(salesId: string, filter: SalesLeadFilter, page: number) {
    const now = this.businessHours.now();
    const today = this.businessHours.todayKey(now);
    const query = this.leadRepository
      .createQueryBuilder('lead')
      .where('lead.assignedToId = :salesId', { salesId })
      .andWhere('lead.status <> :assigned', { assigned: LeadStatus.ASSIGNED })
      .skip(offsetOf(page))
      .take(PAGE_SIZE);
    this.applyKeyword(query, filter.keyword);
    if (filter.status) {
      query.andWhere('lead.status = :status', { status: filter.status });
    } else if (!filter.due) {
      query.andWhere('lead.status IN (:...active)', { active: ACTIVE_CARE_STATUSES });
    }
    if (filter.due === SalesDue.CALLBACK) {
      query
        .andWhere('lead.nextCallbackAt < :endOfToday', {
          endOfToday: this.businessHours.startOfLocalDay(today, 1),
        })
        .andWhere('lead.status IN (:...active)', { active: ACTIVE_CARE_STATUSES })
        .orderBy('lead.nextCallbackAt', 'ASC');
    } else if (filter.due === SalesDue.NOT_CALLED_TODAY) {
      query
        .andWhere('lead.status = :retry', { retry: LeadStatus.NO_ANSWER_RETRY })
        .andWhere('(lead.lastNoAnswerDate IS NULL OR lead.lastNoAnswerDate < :today)', { today })
        .orderBy('lead.noAnswerCount', 'DESC');
    } else if (filter.due === SalesDue.CARE_EXPIRING) {
      query
        .andWhere('lead.status = :contacted', { contacted: LeadStatus.CONTACTED })
        .andWhere('lead.receivedAt <= :threshold', {
          threshold: new Date(now.getTime() - (CONTACTED_CARE_DAYS - CARE_EXPIRING_DAYS_LEFT) * DAY),
        })
        .orderBy('lead.receivedAt', 'ASC');
    } else {
      query.orderBy('lead.nextCallbackAt', 'ASC', 'NULLS LAST').addOrderBy('lead.dateModified', 'DESC');
    }
    const [leads, total] = await query.getManyAndCount();
    return {
      items: leads.map((lead) => this.toSalesView(lead)),
      total,
      page,
      pageSize: PAGE_SIZE,
    };
  }

  /** Số đếm cho thanh tóm tắt / badge ở Fase-Sales. */
  async summaryForSales(salesId: string) {
    const rows = await this.leadRepository
      .createQueryBuilder('lead')
      .select('lead.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('lead.assignedToId = :salesId', { salesId })
      .groupBy('lead.status')
      .getRawMany<{ status: LeadStatus; count: string }>();
    const byStatus = Object.fromEntries(
      Object.values(LeadStatus).map((status) => [status, 0]),
    ) as Record<LeadStatus, number>;
    rows.forEach((row) => (byStatus[row.status] = Number(row.count)));

    const dueCounts = await Promise.all(
      Object.values(SalesDue).map(async (due) => {
        const { total } = await this.searchForSales(salesId, { due }, 1);
        return [due, total] as const;
      }),
    );
    return {
      byStatus,
      pending: byStatus[LeadStatus.ASSIGNED],
      active: ACTIVE_CARE_STATUSES.reduce((sum, status) => sum + byStatus[status], 0),
      due: Object.fromEntries(dueCounts) as Record<SalesDue, number>,
    };
  }

  async detailForSales(salesId: string, id: number) {
    const lead = await this.leadRepository.findOne({ where: { id, assignedToId: salesId } });
    if (!lead) throw new NotFoundException('Không tìm thấy LEAD được phân cho bạn');
    const inNoAnswerFlow =
      lead.status === LeadStatus.RECEIVED || lead.status === LeadStatus.NO_ANSWER_RETRY;
    return {
      ...this.toSalesView(lead),
      countdown:
        lead.status === LeadStatus.ASSIGNED && lead.receiveDeadline
          ? this.businessHours.countdown(lead.receiveDeadline)
          : null,
      /** Trạng thái được chọn khi ghi cuộc gọi, theo kết quả nghe máy hay không. */
      callOutcomes: ACTIVE_CARE_STATUSES.includes(lead.status)
        ? {
            [CallResult.ANSWERED]: SALES_TRANSITIONS[lead.status].filter(
              (status) => status !== LeadStatus.NO_ANSWER_RETRY,
            ),
            [CallResult.NO_ANSWER]: inNoAnswerFlow
              ? NO_ANSWER_OUTCOMES
              : SALES_TRANSITIONS[lead.status].filter((status) => status !== LeadStatus.NO_ANSWER_RETRY),
          }
        : null,
      allowedStatuses: SALES_TRANSITIONS[lead.status].filter(
        (status) => status !== LeadStatus.NO_ANSWER_RETRY,
      ),
      timeline: await this.timeline(lead.id),
    };
  }
}
