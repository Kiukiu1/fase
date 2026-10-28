import {
  Body,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { LeadStatus } from 'src/domain/enums';
import { LeadAssignmentBean } from 'src/domain/lead/lead-assignment.bean';
import { SplitMode } from 'src/domain/lead/lead-assignment.rules';
import { LeadQueryBean, ManagerLeadFilter } from 'src/domain/lead/lead-query.bean';
import {
  ACTIVE_CARE_STATUSES,
  REOPENABLE_STATUSES,
  STATUS_LABELS,
} from 'src/domain/lead/lead-status.rules';
import { UserBean } from 'src/domain/user/user.bean';
import { CmsAction, CmsController, CmsView } from '../cms.decorator';
import { toIdList, toStringList } from '../util/cms.helper';
import type { CmsRequest } from '../util/cms.helper';

const LIST = '/cms/leads';
const SCOPES = ['POOL', 'HELD', 'TERMINAL'] as const;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

interface AssignForm {
  leadIds?: string | string[];
  salesIds?: string | string[];
  mode?: string;
  counts?: Record<string, string>;
  reassign?: string;
}

@CmsController('cms/leads')
export class LeadController {
  constructor(
    private readonly queryBean: LeadQueryBean,
    private readonly assignmentBean: LeadAssignmentBean,
    private readonly userBean: UserBean,
  ) {}

  /** FR-CRM-03: kho LEAD + chọn nhiều để phân. */
  @Get()
  @CmsView('lead/list')
  async list(
    @Req() request: CmsRequest,
    @Query() query: Record<string, string | undefined>,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) pageParam: number,
  ) {
    const managerId = request.user.id;
    const filter: ManagerLeadFilter = {
      keyword: query.keyword?.trim() || undefined,
      scope: SCOPES.find((scope) => scope === query.scope),
      status: Object.values(LeadStatus).find((status) => status === query.status),
      servicePackage: query.servicePackage || undefined,
      salesId: query.salesId || undefined,
      interestedFrom: DATE.test(query.from ?? '') ? query.from : undefined,
      interestedTo: DATE.test(query.to ?? '') ? query.to : undefined,
    };
    const page = Math.max(1, pageParam);
    const [{ leads, total }, sales, servicePackages, counts] = await Promise.all([
      this.queryBean.searchForManager(managerId, filter, page),
      this.userBean.findSalesOfManager(managerId),
      this.queryBean.servicePackagesOf(managerId),
      this.queryBean.countByStatus(managerId),
    ]);
    const held = [LeadStatus.ASSIGNED, ...ACTIVE_CARE_STATUSES].reduce(
      (sum, status) => sum + counts[status],
      0,
    );
    return {
      leads: leads.map((lead) => ({
        ...lead,
        inPool: !lead.assignedToId,
        revocable: !!lead.assignedToId && [LeadStatus.ASSIGNED, ...ACTIVE_CARE_STATUSES].includes(lead.status),
        reopenable: REOPENABLE_STATUSES.includes(lead.status),
      })),
      total,
      page,
      filter,
      query,
      sales,
      servicePackages,
      poolCount: counts[LeadStatus.NEW],
      heldCount: held,
      statuses: Object.values(LeadStatus).map((status) => ({ status, label: STATUS_LABELS[status] })),
      returnTo: request.originalUrl,
    };
  }

  /** FR-CRM-08 */
  @Get(':id')
  @CmsView('lead/detail')
  async detail(@Req() request: CmsRequest, @Param('id', ParseIntPipe) id: number) {
    const [lead, sales] = await Promise.all([
      this.queryBean.findForManager(request.user.id, id),
      this.userBean.findSalesOfManager(request.user.id),
    ]);
    return {
      lead,
      sales,
      timeline: await this.queryBean.timeline(id),
      careDeadline: this.queryBean.careDeadlineOf(lead),
      inPool: !lead.assignedToId,
      revocable: !!lead.assignedToId && [LeadStatus.ASSIGNED, ...ACTIVE_CARE_STATUSES].includes(lead.status),
      reopenable: REOPENABLE_STATUSES.includes(lead.status),
      reassignable: lead.status !== LeadStatus.WON,
      returnTo: request.originalUrl,
    };
  }

  /** FR-CRM-04 / FR-CRM-05 */
  @Post('assign')
  @CmsAction({ to: LIST })
  async assign(@Req() request: CmsRequest, @Body() form: AssignForm) {
    const counts = Object.fromEntries(
      Object.entries(form.counts ?? {}).map(([id, value]) => [id, Number(value || 0)]),
    );
    const result = await this.assignmentBean.assign(request.user, {
      leadIds: toIdList(form.leadIds),
      salesIds: toStringList(form.salesIds),
      mode: form.mode === SplitMode.MANUAL ? SplitMode.MANUAL : SplitMode.EVEN,
      counts,
      reassign: form.reassign === '1',
    });
    const detail = result.perSales
      .filter((item) => item.count)
      .map((item) => `${item.user.fullName}: ${item.count}`)
      .join(', ');
    return `Đã phân ${result.total} LEAD (${detail})`;
  }

  @Post('revoke')
  @CmsAction({ to: LIST })
  async revoke(@Req() request: CmsRequest, @Body() form: { leadIds?: string | string[] }) {
    const count = await this.assignmentBean.revoke(request.user, toIdList(form.leadIds));
    return `Đã thu hồi ${count} LEAD về kho`;
  }

  @Post('reopen')
  @CmsAction({ to: LIST })
  async reopen(@Req() request: CmsRequest, @Body() form: { leadIds?: string | string[] }) {
    const count = await this.assignmentBean.reopen(request.user, toIdList(form.leadIds));
    return `Đã mở lại ${count} LEAD, LEAD đã về kho để phân lại`;
  }
}
