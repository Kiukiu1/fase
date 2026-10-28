import {
  addBusinessMinutes,
  businessMillisBetween,
  isBusinessTime,
  localDateKey,
  parseBusinessCalendar,
} from './business-calendar';

const calendar = parseBusinessCalendar({});
/** Giờ Việt Nam -> Date UTC */
const vn = (text: string) => new Date(`${text}:00+07:00`);

describe('addBusinessMinutes (hạn nhận 2h theo giờ hành chính)', () => {
  it('trong giờ, không vướng nghỉ trưa: 09:00 + 2h = 11:00', () => {
    expect(addBusinessMinutes(vn('2026-10-26T09:00'), 120, calendar)).toEqual(
      vn('2026-10-26T11:00'),
    );
  });

  it('vắt qua nghỉ trưa: 11:30 + 2h = 15:00', () => {
    expect(addBusinessMinutes(vn('2026-10-26T11:30'), 120, calendar)).toEqual(
      vn('2026-10-26T15:00'),
    );
  });

  it('phân trong giờ nghỉ trưa: 12:15 + 2h = 15:30', () => {
    expect(addBusinessMinutes(vn('2026-10-26T12:15'), 120, calendar)).toEqual(
      vn('2026-10-26T15:30'),
    );
  });

  it('phân lúc 17:00 thứ 2 -> 09:30 thứ 3', () => {
    expect(addBusinessMinutes(vn('2026-10-26T17:00'), 120, calendar)).toEqual(
      vn('2026-10-27T09:30'),
    );
  });

  it('phân lúc 17:00 thứ 6 -> 09:30 thứ 2 tuần sau', () => {
    expect(addBusinessMinutes(vn('2026-10-30T17:00'), 120, calendar)).toEqual(
      vn('2026-11-02T09:30'),
    );
  });

  it('phân lúc 20:00 tối -> 10:00 sáng hôm sau', () => {
    expect(addBusinessMinutes(vn('2026-10-26T20:00'), 120, calendar)).toEqual(
      vn('2026-10-27T10:00'),
    );
  });

  it('phân vào thứ 7 -> 10:00 thứ 2', () => {
    expect(addBusinessMinutes(vn('2026-10-31T09:00'), 120, calendar)).toEqual(
      vn('2026-11-02T10:00'),
    );
  });

  it('bỏ qua ngày lễ', () => {
    const withHoliday = parseBusinessCalendar({ HOLIDAYS: '2026-10-27' });
    expect(
      addBusinessMinutes(vn('2026-10-26T17:00'), 120, withHoliday),
    ).toEqual(vn('2026-10-28T09:30'));
  });

  it('đọc khung giờ tuỳ biến từ env (có làm sáng thứ 7)', () => {
    const custom = parseBusinessCalendar({
      BUSINESS_DAYS: '1,2,3,4,5,6',
      BUSINESS_HOURS: '08:00-12:00',
    });
    expect(addBusinessMinutes(vn('2026-10-30T11:00'), 120, custom)).toEqual(
      vn('2026-10-31T09:00'),
    );
  });
});

describe('businessMillisBetween', () => {
  it('chỉ đếm phần trong giờ hành chính', () => {
    const minutes =
      businessMillisBetween(
        vn('2026-10-26T11:00'),
        vn('2026-10-26T14:00'),
        calendar,
      ) / 60_000;
    expect(minutes).toBe(90);
  });

  it('khớp ngược với addBusinessMinutes qua cuối tuần', () => {
    const start = vn('2026-10-30T16:45');
    const deadline = addBusinessMinutes(start, 120, calendar);
    expect(businessMillisBetween(start, deadline, calendar) / 60_000).toBe(
      120,
    );
  });

  it('bằng 0 khi đã quá hạn', () => {
    expect(
      businessMillisBetween(
        vn('2026-10-26T15:00'),
        vn('2026-10-26T14:00'),
        calendar,
      ),
    ).toBe(0);
  });
});

describe('isBusinessTime / localDateKey', () => {
  it('nhận biết trong và ngoài giờ', () => {
    expect(isBusinessTime(vn('2026-10-26T10:00'), calendar)).toBe(true);
    expect(isBusinessTime(vn('2026-10-26T12:30'), calendar)).toBe(false);
    expect(isBusinessTime(vn('2026-10-31T10:00'), calendar)).toBe(false);
  });

  it('ngày địa phương khác ngày UTC sau 0h', () => {
    expect(localDateKey(vn('2026-10-27T06:00'), calendar)).toBe('2026-10-27');
    expect(localDateKey(vn('2026-10-27T00:30'), calendar)).toBe('2026-10-27');
  });
});
