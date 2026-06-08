import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { CompareItem, ItemType } from '../types';

interface CompareState {
  items: CompareItem[];
  loading: boolean;
  fetch: (userId: string) => Promise<void>;
  add: (userId: string, itemId: string, itemType: ItemType) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: (userId: string) => Promise<void>;
}

export const useCompare = create<CompareState>((set, get) => ({
  items: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('compare_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    set({ items: data ?? [], loading: false });
  },

  add: async (userId, itemId, itemType) => {
    const exists = get().items.some((i) => i.item_id === itemId);
    if (exists) return;
    if (get().items.length >= 3) return; // 최대 3개 비교

    const { data } = await supabase
      .from('compare_items')
      .insert({ user_id: userId, item_id: itemId, item_type: itemType })
      .select()
      .single();
    if (data) set((s) => ({ items: [...s.items, data] }));
  },

  remove: async (id) => {
    await supabase.from('compare_items').delete().eq('id', id);
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },

  clear: async (userId) => {
    await supabase.from('compare_items').delete().eq('user_id', userId);
    set({ items: [] });
  },
}));
