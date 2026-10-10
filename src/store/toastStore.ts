import { create } from 'zustand';

export type ToastSeverity = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  message: string;
  severity: ToastSeverity;
}

interface ToastState {
  queue: Toast[];
  push: (message: string, severity: ToastSeverity) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  queue: [],
  push: (message, severity) =>
    set((state) => ({ queue: [...state.queue, { id: nextId++, message, severity }] })),
  dismiss: (id) => set((state) => ({ queue: state.queue.filter((toast) => toast.id !== id) })),
}));

const push = (severity: ToastSeverity) => (message: string) =>
  useToastStore.getState().push(message, severity);

export const toast = {
  success: push('success'),
  error: push('error'),
  info: push('info'),
  warning: push('warning'),
};
