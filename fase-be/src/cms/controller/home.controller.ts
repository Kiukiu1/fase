import { Get, Req } from '@nestjs/common';
import { LeadStatus } from 'src/domain/enums';
import { LeadQueryBean } from 'src/domain/lead/lead-query.bean';
import {
  ACTIVE_CARE_STATUSES,
  STATUS_LABELS,
  TERMINAL_STATUSES,
} from 'src/domain/lead/lead-status.rules';
import { UserBean } from 'src/domain/user/user.bean';
import { CmsController, CmsView } from '../cms.decorator';
import type { CmsRequest } from '../util/cms.helper';

const sum = (counts: Record<LeadStatus, number>, statuses: LeadStatus[]) =>
  statuses.reduce((total, status) => total + counts[status], 0);

@CmsController('cms')
export class HomeController {
  constructor(
    private readonly queryBean: LeadQueryBean,
    private readonly userBean: UserBean,
  ) {}

  /** Tổng quan kho LEAD của phòng (bản đơn giản; dashboard đầy đủ ở phase sau). */
  @Get()
  @CmsView('home')
  async overview(@Req() request: CmsRequest) {
    const [counts, sales] = await Promise.all([
      this.queryBean.countByStatus(request.user.id),
      this.userBean.findSalesOfManager(request.user.id),
    ]);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const terminal = sum(counts, TERMINAL_STATUSES);
    return {
      total,
      pool: counts[LeadStatus.NEW],
      pending: counts[LeadStatus.ASSIGNED],
      active: sum(counts, ACTIVE_CARE_STATUSES),
      terminal,
      won: counts[LeadStatus.WON],
      winRate: terminal ? Math.round((counts[LeadStatus.WON] / terminal) * 1000) / 10 : 0,
      salesCount: sales.length,
      statusRows: Object.values(LeadStatus).map((status) => ({
        status,
        label: STATUS_LABELS[status],
        count: counts[status],
        percent: total ? Math.round((counts[status] / total) * 100) : 0,
      })),
    };
  }
}
