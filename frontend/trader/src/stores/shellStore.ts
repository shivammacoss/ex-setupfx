import { create } from 'zustand';

interface ShellState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  _hydrated: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  hydrate: () => void;
}

const COLLAPSE_KEY = 'piphigh.sidebar.collapsed';

function readCollapsedFromStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsedToStorage(collapsed: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export const useShellStore = create<ShellState>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  _hydrated: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarCollapsed: (collapsed) => {
    writeCollapsedToStorage(collapsed);
    set({ sidebarCollapsed: collapsed });
  },
  toggleSidebarCollapsed: () =>
    set((s) => {
      const next = !s.sidebarCollapsed;
      writeCollapsedToStorage(next);
      return { sidebarCollapsed: next };
    }),
  hydrate: () => set((s) => {
    if (s._hydrated) return {};
    return {
      sidebarOpen: window.innerWidth >= 1024,
      sidebarCollapsed: readCollapsedFromStorage(),
      _hydrated: true,
    };
  }),
}));

// Hydrate on client — runs once after mount
if (typeof window !== 'undefined') {
  // Delay to ensure window dimensions are correct
  setTimeout(() => useShellStore.getState().hydrate(), 0);

  // Responsive resize listener: auto-show sidebar on desktop, auto-hide on mobile
  const LG_BREAKPOINT = 1024;
  let prevIsDesktop = window.innerWidth >= LG_BREAKPOINT;

  window.addEventListener('resize', () => {
    const isDesktop = window.innerWidth >= LG_BREAKPOINT;
    if (isDesktop !== prevIsDesktop) {
      prevIsDesktop = isDesktop;
      useShellStore.getState().setSidebarOpen(isDesktop);
    }
  });
}
