import { Injectable } from '@nestjs/common';
import {
  addBusinessMinutes,
  BusinessCalendar,
  businessMillisBetween,
  isBusinessTime,
  localDateKey,
  nextBusinessWindow,
  parseBusinessCalendar,
} from './business-calendar';

export interface ReceiveCountdown {
  /** Số giây giờ hành chính còn lại trước hạn nhận. */
  remainingSeconds: number;
  /** Đang ngoài giờ hành chính nên đồng hồ tạm dừng. */
  paused: boolean;
  /** Khi đang tạm dừng: thời điểm đồng hồ chạy lại. */
  resumeAt: Date | null;
}

/** Điểm duy nhất trong hệ thống được hỏi "bây giờ là mấy giờ" theo nghiệp vụ. */
@Injectable()
export class BusinessHoursService {
  readonly calendar: BusinessCalendar = parseBusinessCalendar(process.env);

  now() {
    return new Date();
  }

  todayKey(at = this.now()) {
    return localDateKey(at, this.calendar);
  }

  dateKey(at: Date) {
    return localDateKey(at, this.calendar);
  }

  /** Thời điểm UTC của 00:00 giờ địa phương của ngày `dateKey` (+ `addDays`). */
  startOfLocalDay(dateKey: string, addDays = 0) {
    const midnightUtc = Date.parse(`${dateKey}T00:00:00Z`);
    return new Date(
      midnightUtc +
        addDays * 86_400_000 -
        this.calendar.utcOffsetMinutes * 60_000,
    );
  }

  /** "HH:mm dd/MM/yyyy" theo giờ địa phương, dùng trong nội dung thông báo. */
  format(at: Date) {
    const local = new Date(
      at.getTime() + this.calendar.utcOffsetMinutes * 60_000,
    );
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())} ${pad(local.getUTCDate())}/${pad(local.getUTCMonth() + 1)}/${local.getUTCFullYear()}`;
  }

  deadlineFrom(start: Date, minutes: number) {
    return addBusinessMinutes(start, minutes, this.calendar);
  }

  remainingMinutes(deadline: Date, at = this.now()) {
    return businessMillisBetween(at, deadline, this.calendar) / 60_000;
  }

  countdown(deadline: Date, at = this.now()): ReceiveCountdown {
    const remainingSeconds = Math.max(
      0,
      Math.floor(businessMillisBetween(at, deadline, this.calendar) / 1000),
    );
    const paused =
      remainingSeconds > 0 && !isBusinessTime(at, this.calendar);
    return {
      remainingSeconds,
      paused,
      resumeAt: paused ? nextBusinessWindow(at, this.calendar).start : null,
    };
  }
}
