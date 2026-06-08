import { create } from 'zustand';

interface PostStore {
  refreshKey: number;
  triggerRefresh: () => void;
}

export const usePostStore = create<PostStore>((set) => ({
  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
