import { SplitMode, splitLeads } from './lead-assignment.rules';

describe('splitLeads', () => {
  it('chia đều lần lượt, người đầu nhận phần dư', () => {
    const plan = splitLeads([1, 2, 3, 4, 5], ['a', 'b'], SplitMode.EVEN);
    expect(plan.get('a')).toEqual([1, 3, 5]);
    expect(plan.get('b')).toEqual([2, 4]);
  });

  it('chia thủ công theo số lượng nhập', () => {
    const plan = splitLeads([1, 2, 3, 4], ['a', 'b', 'c'], SplitMode.MANUAL, {
      a: 1,
      b: 0,
      c: 3,
    });
    expect(plan.get('a')).toEqual([1]);
    expect(plan.get('b')).toEqual([]);
    expect(plan.get('c')).toEqual([2, 3, 4]);
  });

  it('chia thủ công phải khớp tổng', () => {
    expect(() =>
      splitLeads([1, 2, 3], ['a', 'b'], SplitMode.MANUAL, { a: 1, b: 1 }),
    ).toThrow('Tổng số lượng chia (2) phải bằng số LEAD đã chọn (3)');
  });

  it('báo lỗi khi chưa chọn LEAD hoặc nhân viên', () => {
    expect(() => splitLeads([], ['a'], SplitMode.EVEN)).toThrow('LEAD');
    expect(() => splitLeads([1], [], SplitMode.EVEN)).toThrow('nhân viên');
  });
});
