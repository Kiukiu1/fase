import { CallResult, LeadStatus } from '../enums';
import { assertSalesTransition, planCall } from './lead-status.rules';

const base = {
  status: LeadStatus.RECEIVED,
  noAnswerCount: 0,
  lastNoAnswerDate: null,
  today: '2026-10-26',
};

describe('assertSalesTransition', () => {
  it('cho phép Đang chăm sóc -> Đã demo / báo giá', () => {
    expect(() =>
      assertSalesTransition(LeadStatus.NURTURING, LeadStatus.DEMO_QUOTED),
    ).not.toThrow();
  });

  it('chặn chuyển tiếp từ trạng thái kết thúc', () => {
    expect(() =>
      assertSalesTransition(LeadStatus.NO_NEED, LeadStatus.NURTURING),
    ).toThrow('Không thể chuyển');
  });

  it('Dừng bắt buộc có lý do (BR-06)', () => {
    expect(() =>
      assertSalesTransition(LeadStatus.NURTURING, LeadStatus.STOPPED, '  '),
    ).toThrow('bắt buộc nhập lý do');
    expect(() =>
      assertSalesTransition(
        LeadStatus.NURTURING,
        LeadStatus.STOPPED,
        'Khách đi công tác dài ngày',
      ),
    ).not.toThrow();
  });
});

describe('planCall – BR-02 bộ đếm 7 cuộc / 7 ngày', () => {
  it('cuộc đầu không nghe máy -> Gọi tiếp, đếm 1/7', () => {
    expect(planCall({ ...base, result: CallResult.NO_ANSWER })).toEqual({
      nextStatus: LeadStatus.NO_ANSWER_RETRY,
      autoGiveUp: false,
      counted: true,
      noAnswerCount: 1,
      lastNoAnswerDate: '2026-10-26',
    });
  });

  it('gọi thêm trong cùng ngày không tăng bộ đếm', () => {
    const plan = planCall({
      ...base,
      status: LeadStatus.NO_ANSWER_RETRY,
      noAnswerCount: 3,
      lastNoAnswerDate: '2026-10-26',
      result: CallResult.NO_ANSWER,
    });
    expect(plan.counted).toBe(false);
    expect(plan.noAnswerCount).toBe(3);
    expect(plan.nextStatus).toBeNull();
  });

  it('ngày thứ 7 vẫn không nghe -> tự chuyển Từ bỏ', () => {
    const plan = planCall({
      ...base,
      status: LeadStatus.NO_ANSWER_RETRY,
      noAnswerCount: 6,
      lastNoAnswerDate: '2026-10-25',
      result: CallResult.NO_ANSWER,
    });
    expect(plan.noAnswerCount).toBe(7);
    expect(plan.autoGiveUp).toBe(true);
  });

  it('khách nghe máy thì phải chọn trạng thái mới, bộ đếm giữ nguyên', () => {
    expect(() =>
      planCall({
        ...base,
        status: LeadStatus.NO_ANSWER_RETRY,
        noAnswerCount: 2,
        result: CallResult.ANSWERED,
      }),
    ).toThrow('chọn trạng thái');
    const plan = planCall({
      ...base,
      status: LeadStatus.NO_ANSWER_RETRY,
      noAnswerCount: 2,
      result: CallResult.ANSWERED,
      requestedStatus: LeadStatus.CONTACTED,
    });
    expect(plan.nextStatus).toBe(LeadStatus.CONTACTED);
    expect(plan.noAnswerCount).toBe(2);
    expect(plan.autoGiveUp).toBe(false);
  });

  it('không nghe máy nhưng phát hiện sai số -> Sai số, không đếm', () => {
    const plan = planCall({
      ...base,
      result: CallResult.NO_ANSWER,
      requestedStatus: LeadStatus.WRONG_NUMBER,
    });
    expect(plan.nextStatus).toBe(LeadStatus.WRONG_NUMBER);
    expect(plan.counted).toBe(false);
  });

  it('không nghe máy thì không được chọn Đang chăm sóc', () => {
    expect(() =>
      planCall({
        ...base,
        result: CallResult.NO_ANSWER,
        requestedStatus: LeadStatus.NURTURING,
      }),
    ).toThrow('Khách không nghe máy');
  });

  it('LEAD Đã liên hệ gọi không nghe máy: giữ trạng thái, không đếm', () => {
    const plan = planCall({
      ...base,
      status: LeadStatus.CONTACTED,
      result: CallResult.NO_ANSWER,
    });
    expect(plan.nextStatus).toBeNull();
    expect(plan.counted).toBe(false);
  });

  it('không cho ghi cuộc gọi khi LEAD đã kết thúc hoặc chưa nhận', () => {
    expect(() =>
      planCall({ ...base, status: LeadStatus.WON, result: CallResult.ANSWERED }),
    ).toThrow();
    expect(() =>
      planCall({
        ...base,
        status: LeadStatus.ASSIGNED,
        result: CallResult.ANSWERED,
      }),
    ).toThrow();
  });
});
