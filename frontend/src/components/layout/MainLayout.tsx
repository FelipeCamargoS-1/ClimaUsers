import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useTheme } from '../../context/ThemeContext';

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#fbfcfe] dark:bg-[#0b101b]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <Navbar onMenuToggle={() => setSidebarOpen((value) => !value)} theme={theme} onThemeToggle={toggleTheme} />
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 xl:px-8 xl:py-8"><div className="mx-auto w-full max-w-[1440px]"><Outlet /></div></main>
      </div>
    </div>
  );
}
