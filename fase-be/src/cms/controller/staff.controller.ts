import { Get, Req } from '@nestjs/common';
import { LeadStatus } from 'src/domain/enums';
import { LeadQueryBean } from 'src/domain/lead/lead-query.bean';
import {
  ACTIVE_CARE_STATUSES,
  TERMINAL_STATUSES,
} from 'src/domain/lead/lead-status.rules';
import { UserBean } from 'src/domain/user/user.bean';
import { CmsController, CmsView } from '../cms.decorator';
import type { CmsRequest } from '../util/cms.helper';

/** FR-CRM-06: nhân viên thuộc phòng (tài khoản do quản trị viên tạo trong DB). */
@CmsController('cms/staff')
export class StaffController {
  constructor(
    private readonly userBean: UserBean,
    private readonly queryBean: LeadQueryBean,
  ) {}

  @Get()
  @CmsView('staff/list')
  async list(@Req() request: CmsRequest) {
    const [sales, rows] = await Promise.all([
      this.userBean.findSalesOfManager(request.user.id),
      this.queryBean.countBySalesAndStatus(request.user.id),
    ]);
    const countOf = (salesId: string, statuses: LeadStatus[]) =>
      rows
        .filter((row) => row.salesId === salesId && statuses.includes(row.status))
        .reduce((sum, row) => sum + row.count, 0);
    return {
      staff: sales.map((user) => ({
        ...user,
        pending: countOf(user.id, [LeadStatus.ASSIGNED]),
        active: countOf(user.id, ACTIVE_CARE_STATUSES),
        won: countOf(user.id, [LeadStatus.WON]),
        closed: countOf(user.id, TERMINAL_STATUSES),
      })),
    };
  }
}
