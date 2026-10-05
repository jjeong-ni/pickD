import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { optimistic, reportMutationError } from '../lib/mutate';
import { CompareItem, ItemType } from '../types';

export const MAX_COMPARE_ITEMS = 3;

interface CompareState {
  items: CompareItem[];
  loading: boolean;
  fetch: (userId: string) => Promise<void>;
  add: (userId: string, itemId: string, itemType: ItemType) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  clear: (userId: string) => Promise<boolean>;
}

let tempSeq = 0;
const tempId = () => `tmp-${Date.now()}-${tempSeq++}`;

export const useCompare = create<CompareState>((set, get) => ({
  items: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('compare_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) {
        // 읽기 실패는 되돌릴 게 없다. 다만 **조용히 지나가면 안 된다** —
        // 빈 비교함과 "못 불러온 비교함"은 사용자에게 전혀 다른 사실이다.
        reportMutationError('비교함 불러오기', error.message);
        set({ loading: false });
        return;
      }
      set({ items: data ?? [], loading: false });
    } catch (e) {
      reportMutationError('비교함 불러오기');
      set({ loading: false });
    }
  },

  add: async (userId, itemId, itemType) => {
    if (get().items.some((i) => i.item_id === itemId)) return false;
    if (get().items.length >= MAX_COMPARE_ITEMS) return false;

    // 서버가 돌려줄 행을 미리 흉내 낸다. id 는 임시이고, 성공하면 진짜로 바꿔 낀다.
    const draft: CompareItem = {
      id: tempId(),
      user_id: userId,
      item_id: itemId,
      item_type: itemType,
      created_at: new Date().toISOString(),
    };

    return optimistic<CompareItem>({
      what: '비교함에 추가',
      apply: () => set((s) => ({ items: [...s.items, draft] })),
      rollback: () => set((s) => ({ items: s.items.filter((i) => i.id !== draft.id) })),
      commit: () =>
        supabase
          .from('compare_items')
          .insert({ user_id: userId, item_id: itemId, item_type: itemType })
          .select()
          .single(),
      // ★ 임시 id 를 진짜 id 로 바꿔 끼운다. 이걸 빠뜨리면 바로 다음 '제거'가
      //   `delete().eq('id', 'tmp-...')` 를 보내 서버에서 0행 삭제로 조용히 성공한다.
      reconcile: (row) => set((s) => ({ items: s.items.map((i) => (i.id === draft.id ? row : i)) })),
    });
  },

  remove: async (id) => {
    const prev = get().items;
    return optimistic({
      what: '비교함에서 제거',
      apply: () => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      rollback: () => set({ items: prev }),
      commit: () => supabase.from('compare_items').delete().eq('id', id),
    });
  },

  clear: async (userId) => {
    const prev = get().items;
    return optimistic({
      what: '비교함 비우기',
      apply: () => set({ items: [] }),
      rollback: () => set({ items: prev }),
      commit: () => supabase.from('compare_items').delete().eq('user_id', userId),
    });
  },
}));
