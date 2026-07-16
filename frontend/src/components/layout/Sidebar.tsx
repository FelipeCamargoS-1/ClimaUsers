import { NavLink } from 'react-router-dom';
import { CloudSun, Home, LogOut, Moon, Settings, Users, X } from 'lucide-react';

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const primaryItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Usuários', path: '/users', icon: Users },
    { name: 'Clima', path: '/weather', icon: CloudSun },
  ];

  const secondaryItems = [
    { name: 'Configurações', path: '/settings', icon: Settings },
    { name: 'Sair', path: '/', icon: LogOut },
  ];

  return (
    <>
      {isOpen && <div onClick={onClose} className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm lg:hidden" />}
      <aside className={`fixed bottom-0 left-0 top-0 z-40 flex w-[238px] flex-col border-r border-[#e8edf5] bg-white transition-transform lg:static lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-7 pb-8 pt-9">
          <div className="flex items-center gap-3">
            <CloudSun className="h-8 w-8 text-[#6c3df1]" />
            <div className="text-[17px] font-semibold tracking-[-0.02em] text-[#3420a9]">Weather<span className="text-[#2f2d42]">Users</span></div>
          </div>
          <button className="rounded-xl p-2 text-slate-500 lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 px-4">
          <nav className="space-y-2">
            {primaryItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={`${item.path}-${item.name}`}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-4 rounded-2xl px-4 py-4 text-[15px] font-medium transition ${
                      isActive ? 'bg-[#f3ecff] text-[#6c3df1]' : 'text-[#2f3749] hover:bg-[#f7f8fc]'
                    }`
                  }
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          <div className="my-8 h-px bg-[#edf1f7]" />

          <nav className="space-y-2">
            {secondaryItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={`${item.name}-${item.path}`} to={item.path} onClick={onClose} className="flex items-center gap-4 rounded-2xl px-4 py-4 text-[15px] font-medium text-[#2f3749] transition hover:bg-[#f7f8fc]">
                  <Icon className="h-5 w-5" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between rounded-2xl border border-[#e8edf5] px-4 py-4">
            <div className="flex items-center gap-3 text-[#2f3749]">
              <Moon className="h-5 w-5" />
              <span className="text-[15px] font-medium">Modo escuro</span>
            </div>
            <div className="relative h-7 w-12 rounded-full bg-[#eef1f6]">
              <div className="absolute right-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
