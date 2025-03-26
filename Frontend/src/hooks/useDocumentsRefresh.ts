import { create } from 'zustand';

interface DocumentsRefreshStore {
  timestamp: number;
  refresh: () => void;
}

const useDocumentsRefreshStore = create<DocumentsRefreshStore>((set) => ({
  timestamp: Date.now(),
  refresh: () => set({ timestamp: Date.now() }),
}));

export const useDocumentsRefresh = () => {
  const { timestamp, refresh } = useDocumentsRefreshStore();
  return { timestamp, refresh };
}; 