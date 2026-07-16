import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#fbfcfe]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <Navbar onMenuToggle={() => setSidebarOpen((value) => !value)} theme={theme} onThemeToggle={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))} />
        <main className="flex-1 overflow-y-auto px-8 py-8"><div className="mx-auto w-full max-w-[1240px]"><Outlet /></div></main>
      </div>
    </div>
  );
}
