import { setMutationReporter } from '../lib/mutate';
import { MAX_COMPARE_ITEMS, useCompare } from '../hooks/useCompare';

type Res = { data: unknown; error: unknown };

// 실제 Supabase 대신, insert / delete 가 무엇을 돌려줄지 테스트마다 정한다.
const mockServer: { insert: (row: Record<string, unknown>) => Res; delete: () => Res } = {
  insert: () => ({ data: null, error: null }),
  delete: () => ({ data: null, error: null }),
};
const mockDeleteEq = jest.fn();

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: (row: Record<string, unknown>) => ({
        select: () => ({ single: () => Promise.resolve(mockServer.insert(row)) }),
      }),
      delete: () => ({
        eq: (col: string, val: string) => {
          mockDeleteEq(col, val);
          return Promise.resolve(mockServer.delete());
        },
      }),
    }),
  },
}));

const reports: string[] = [];

beforeEach(() => {
  useCompare.setState({ items: [], loading: false });
  reports.length = 0;
  setMutationReporter((title) => reports.push(title));
  mockDeleteEq.mockClear();
  let seq = 0;
  // 서버는 넣은 행에 진짜 id 를 붙여 돌려준다.
  mockServer.insert = (row) => {
    seq += 1;
    return {
      data: { ...row, id: `srv-${seq}`, created_at: '' },
      error: null,
    };
  };
  mockServer.delete = () => ({ data: null, error: null });
});

afterAll(() => setMutationReporter(null));

describe('비교함 (useCompare)', () => {
  it(`최대 ${MAX_COMPARE_ITEMS}개까지만 담긴다`, async () => {
    const { add } = useCompare.getState();
    expect(await add('u1', 'a', 'treatment')).toBe(true);
    expect(await add('u1', 'b', 'treatment')).toBe(true);
    expect(await add('u1', 'c', 'device')).toBe(true);
    expect(await add('u1', 'd', 'device')).toBe(false);
    expect(useCompare.getState().items).toHaveLength(MAX_COMPARE_ITEMS);
  });

  it('같은 항목은 두 번 담기지 않는다', async () => {
    const { add } = useCompare.getState();
    await add('u1', 'a', 'treatment');
    expect(await add('u1', 'a', 'treatment')).toBe(false);
    expect(useCompare.getState().items).toHaveLength(1);
  });

  it('추가가 성공하면 임시 id 를 서버 id 로 바꿔 끼워, 다음 삭제가 진짜 행을 지운다', async () => {
    await useCompare.getState().add('u1', 'a', 'treatment');
    const [item] = useCompare.getState().items;
    expect(item.id).toBe('srv-1');
    await useCompare.getState().remove(item.id);
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'srv-1');
  });

  it('추가가 실패하면 되돌리고, 되돌렸다고 알린다', async () => {
    mockServer.insert = () => ({ data: null, error: { message: 'RLS' } });
    expect(await useCompare.getState().add('u1', 'a', 'treatment')).toBe(false);
    expect(useCompare.getState().items).toEqual([]);
    expect(reports).toEqual(['비교함에 추가 실패']);
  });

  it('삭제가 실패하면 원래 목록으로 돌아오고 알린다', async () => {
    await useCompare.getState().add('u1', 'a', 'treatment');
    const before = useCompare.getState().items;
    mockServer.delete = () => ({ data: null, error: { message: 'network' } });
    expect(await useCompare.getState().remove(before[0].id)).toBe(false);
    expect(useCompare.getState().items).toEqual(before);
    expect(reports).toEqual(['비교함에서 제거 실패']);
  });
});
