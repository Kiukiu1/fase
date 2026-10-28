import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeadAssignmentBean } from '../lead/lead-assignment.bean';
import { LeadCareBean } from '../lead/lead-care.bean';

/**
 * Job nền theo BR-01, BR-03 và các nhắc nhở. Mỗi job tự chống chạy chồng trong
 * một tiến trình; giữa nhiều tiến trình thì an toàn nhờ UPDATE có điều kiện + SKIP LOCKED.
 */
@Injectable()
export class LeadScheduler {
  private readonly logger = new Logger('LeadScheduler');
  private readonly running = new Set<string>();

  constructor(
    private readonly assignmentBean: LeadAssignmentBean,
    private readonly careBean: LeadCareBean,
  ) {}

  private async runOnce(name: string, job: () => Promise<number>) {
    if (process.env.SCHEDULER_ENABLED === 'false' || this.running.has(name)) return;
    this.running.add(name);
    try {
      const count = await job();
      if (count) this.logger.log(`${name}: ${count} LEAD`);
    } catch (error) {
      this.logger.error(`${name} lỗi`, error instanceof Error ? error.stack : error);
    } finally {
      this.running.delete(name);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async everyMinute() {
    await this.runOnce('BR-01 trả LEAD quá hạn nhận', async () => {
      let total = 0;
      for (let batch = await this.assignmentBean.returnExpired(); batch; batch = await this.assignmentBean.returnExpired()) {
        total += batch;
      }
      return total;
    });
    await this.runOnce('Nhắc sắp hết hạn nhận', () => this.assignmentBean.warnExpiring());
    await this.runOnce('Nhắc lịch gọi lại', () => this.careBean.notifyDueCallbacks());
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async everyTenMinutes() {
    await this.runOnce('BR-03 Đã liên hệ quá 7 ngày', async () => {
      let total = 0;
      for (let batch = await this.careBean.giveUpStaleContacted(); batch; batch = await this.careBean.giveUpStaleContacted()) {
        total += batch;
      }
      return total;
    });
  }
}
