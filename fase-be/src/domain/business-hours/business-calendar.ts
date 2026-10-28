/**
 * Lịch giờ hành chính dùng để tính hạn nhận LEAD (BR-01).
 * Múi giờ nghiệp vụ là Asia/Ho_Chi_Minh (UTC+7, không có giờ mùa hè)
 * nên chỉ cần một độ lệch cố định; mọi Date truyền vào/ra đều là thời điểm UTC.
 */
export interface BusinessCalendar {
  utcOffsetMinutes: number;
  /** 0 = Chủ nhật ... 6 = Thứ 7 */
  workDays: number[];
  /** Các khung làm việc trong ngày, tính bằng phút từ 00:00 giờ địa phương. */
  windows: { start: number; end: number }[];
  /** Ngày nghỉ lễ dạng YYYY-MM-DD theo giờ địa phương. */
  holidays: Set<string>;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const MAX_DAYS_SCANNED = 400;

const toMinutes = (hhmm: string) => {
  const [hours, minutes] = hhmm.trim().split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    throw new Error(`Giờ không hợp lệ: ${hhmm}`);
  }
  return hours * 60 + minutes;
};

export function parseBusinessCalendar(env: {
  BUSINESS_DAYS?: string;
  BUSINESS_HOURS?: string;
  HOLIDAYS?: string;
  BUSINESS_UTC_OFFSET_MINUTES?: string;
}): BusinessCalendar {
  const workDays = (env.BUSINESS_DAYS || '1,2,3,4,5')
    .split(',')
    .map((day) => Number(day.trim()));
  const windows = (env.BUSINESS_HOURS || '08:00-12:00,13:30-17:30')
    .split(',')
    .map((range) => {
      const [start, end] = range.split('-').map(toMinutes);
      if (!(start < end)) throw new Error(`Khung giờ không hợp lệ: ${range}`);
      return { start, end };
    })
    .sort((a, b) => a.start - b.start);
  const holidays = new Set(
    (env.HOLIDAYS || '')
      .split(',')
      .map((day) => day.trim())
      .filter(Boolean),
  );
  return {
    utcOffsetMinutes: Number(env.BUSINESS_UTC_OFFSET_MINUTES ?? 420),
    workDays,
    windows,
    holidays,
  };
}

/** Ngày địa phương (YYYY-MM-DD) của một thời điểm. */
export function localDateKey(date: Date, calendar: BusinessCalendar) {
  return new Date(date.getTime() + calendar.utcOffsetMinutes * MINUTE)
    .toISOString()
    .slice(0, 10);
}

/** Thời điểm UTC của 00:00 giờ địa phương trong ngày chứa `date`. */
function localMidnight(date: Date, calendar: BusinessCalendar) {
  const offset = calendar.utcOffsetMinutes * MINUTE;
  const shifted = date.getTime() + offset;
  return shifted - (((shifted % DAY) + DAY) % DAY) - offset;
}

function isWorkDay(midnight: number, calendar: BusinessCalendar) {
  const local = new Date(midnight + calendar.utcOffsetMinutes * MINUTE);
  return (
    calendar.workDays.includes(local.getUTCDay()) &&
    !calendar.holidays.has(local.toISOString().slice(0, 10))
  );
}

/** Khung làm việc đầu tiên còn chưa kết thúc tính từ `from` (cắt phần đã qua). */
export function nextBusinessWindow(from: Date, calendar: BusinessCalendar) {
  const time = from.getTime();
  let midnight = localMidnight(from, calendar);
  for (let day = 0; day < MAX_DAYS_SCANNED; day++, midnight += DAY) {
    if (!isWorkDay(midnight, calendar)) continue;
    for (const window of calendar.windows) {
      const start = midnight + window.start * MINUTE;
      const end = midnight + window.end * MINUTE;
      if (time < end) {
        return { start: new Date(Math.max(time, start)), end: new Date(end) };
      }
    }
  }
  throw new Error('Không tìm thấy giờ hành chính trong lịch');
}

export function isBusinessTime(at: Date, calendar: BusinessCalendar) {
  return nextBusinessWindow(at, calendar).start.getTime() === at.getTime();
}

/** Cộng `minutes` phút giờ hành chính vào `start`; ngoài giờ thì đồng hồ dừng. */
export function addBusinessMinutes(
  start: Date,
  minutes: number,
  calendar: BusinessCalendar,
) {
  let remaining = minutes * MINUTE;
  let cursor = start;
  for (;;) {
    const window = nextBusinessWindow(cursor, calendar);
    const available = window.end.getTime() - window.start.getTime();
    if (remaining <= available) {
      return new Date(window.start.getTime() + remaining);
    }
    remaining -= available;
    cursor = window.end;
  }
}

/** Số mili-giây giờ hành chính nằm trong khoảng [from, to). */
export function businessMillisBetween(
  from: Date,
  to: Date,
  calendar: BusinessCalendar,
) {
  let total = 0;
  let cursor = from;
  while (cursor.getTime() < to.getTime()) {
    const window = nextBusinessWindow(cursor, calendar);
    if (window.start.getTime() >= to.getTime()) break;
    total +=
      Math.min(window.end.getTime(), to.getTime()) - window.start.getTime();
    cursor = window.end;
  }
  return total;
}
