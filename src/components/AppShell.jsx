import React from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import Toast from './Toast.jsx';
import { useUI } from '../store.jsx';

// The pipeline builder is a full-screen canvas tool: it collapses the nav
// sidebar and shrinks the topbar (see Topbar.jsx) so the canvas gets as much
// of the viewport as possible, instead of sitting in the normal padded page
// column every other section uses.
export default function AppShell({ children }) {
  const { section } = useUI();
  const full = section === 'pipelineBuilder';

  if (full) {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <Topbar />
        <div className="min-h-0 flex-1">{children}</div>
        <Toast />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-[248px_1fr] max-[860px]:grid-cols-[64px_1fr]">
      <Sidebar />
      <main className="min-w-0">
        <Topbar />
        <div className="mx-auto max-w-[1550px] p-7 max-[860px]:p-4">{children}</div>
      </main>
      <Toast />
    </div>
  );
}
