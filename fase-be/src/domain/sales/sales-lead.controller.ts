import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '../auth/auth.guard';
import { LeadStatus, UserRole } from '../enums';
import { LeadAssignmentBean } from '../lead/lead-assignment.bean';
import { LeadCareBean } from '../lead/lead-care.bean';
import { LeadQueryBean } from '../lead/lead-query.bean';
import { STATUS_LABELS } from '../lead/lead-status.rules';
import type { Users } from '../user/entity/user.entity';
import {
  CallbackDto,
  ChangeStatusDto,
  LogCallDto,
  SalesLeadQueryDto,
} from './sales-lead.dto';

/** API cho Fase-Sales: chỉ nhân viên role sales, chỉ LEAD của chính mình. */
@ApiTags('Sales – LEAD')
@Controller('sales')
@Authenticated(UserRole.SALES)
export class SalesLeadController {
  constructor(
    private readonly queryBean: LeadQueryBean,
    private readonly assignmentBean: LeadAssignmentBean,
    private readonly careBean: LeadCareBean,
  ) {}

  @Get('statuses')
  statuses() {
    return Object.values(LeadStatus).map((status) => ({
      status,
      label: STATUS_LABELS[status],
    }));
  }

  @Get('summary')
  summary(@CurrentUser() user: Users) {
    return this.queryBean.summaryForSales(user.id);
  }

  /** FR-SAL-01 */
  @Get('leads/pending')
  pending(@CurrentUser() user: Users) {
    return this.queryBean.pendingForSales(user.id);
  }

  /** FR-SAL-05 */
  @Get('leads')
  list(@CurrentUser() user: Users, @Query() query: SalesLeadQueryDto) {
    return this.queryBean.searchForSales(user.id, query, query.page);
  }

  /** FR-SAL-07 */
  @Get('leads/:id')
  detail(@CurrentUser() user: Users, @Param('id', ParseIntPipe) id: number) {
    return this.queryBean.detailForSales(user.id, id);
  }

  /** FR-SAL-02: nhận LEAD = gọi ngay. */
  @Post('leads/:id/receive')
  @HttpCode(200)
  async receive(@CurrentUser() user: Users, @Param('id', ParseIntPipe) id: number) {
    await this.assignmentBean.receive(user, id);
    return this.queryBean.detailForSales(user.id, id);
  }

  /** FR-SAL-03 */
  @Post('leads/:id/calls')
  async logCall(
    @CurrentUser() user: Users,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LogCallDto,
  ) {
    const result = await this.careBean.logCall(user, id, dto);
    return {
      counted: result.counted,
      autoGiveUp: result.autoGiveUp,
      lead: await this.queryBean.detailForSales(user.id, id),
    };
  }

  @Post('leads/:id/status')
  @HttpCode(200)
  async changeStatus(
    @CurrentUser() user: Users,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeStatusDto,
  ) {
    await this.careBean.changeStatus(user, id, dto.status, dto.reason);
    return this.queryBean.detailForSales(user.id, id);
  }

  /** FR-SAL-04 */
  @Put('leads/:id/callback')
  async setCallback(
    @CurrentUser() user: Users,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CallbackDto,
  ) {
    await this.careBean.setCallback(user, id, dto.callbackAt ?? null);
    return this.queryBean.detailForSales(user.id, id);
  }
}
