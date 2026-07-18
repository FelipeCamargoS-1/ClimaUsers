import { NavLink, useNavigate } from 'react-router-dom';
import { CloudSun, Home, LogOut, Moon, Settings, Sun, UserCircle2, Users, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const auth = useAuth();
  const primaryItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Usuários', path: '/users', icon: Users },
    { name: 'Clima', path: '/weather', icon: CloudSun },
  ];

  return (
    <>
      {isOpen && <div onClick={onClose} className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm" />}
      <aside className={`fixed bottom-0 left-0 top-0 z-40 flex w-[min(86vw,280px)] flex-col border-r border-[#e8edf5] bg-white shadow-2xl transition-transform duration-300 dark:border-[#1c2436] dark:bg-[#101725] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-7 pb-8 pt-9">
          <div className="flex items-center gap-3">
            <CloudSun className="h-8 w-8 text-[#6c3df1]" />
            <div className="text-[17px] font-semibold tracking-[-0.02em] text-[#3420a9] dark:text-[#9db4ff]">Weather<span className="text-[#2f2d42] dark:text-white">Users</span></div>
          </div>
          <button className="rounded-xl p-2 text-slate-500" onClick={onClose}>
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
                      isActive ? 'bg-[#f3ecff] text-[#6c3df1] dark:bg-[#1f2740] dark:text-[#9db4ff]' : 'text-[#2f3749] hover:bg-[#f7f8fc] dark:text-[#c9d3e6] dark:hover:bg-[#151d2d]'
                    }`
                  }
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          <div className="my-8 h-px bg-[#edf1f7] dark:bg-[#1c2436]" />

          <nav className="space-y-2">
            <NavLink to="/profile" onClick={onClose} className={({ isActive }) => `flex items-center gap-4 rounded-2xl px-4 py-4 text-[15px] font-medium transition ${isActive ? 'bg-[#f3ecff] text-[#6c3df1] dark:bg-[#223150] dark:text-[#c9d8ff]' : 'text-[#2f3749] hover:bg-[#f7f8fc] dark:text-[#d3dded] dark:hover:bg-[#172133]'}`}>
              <UserCircle2 className="h-5 w-5" />
              Perfil
            </NavLink>
            <NavLink to="/settings" onClick={onClose} className={({ isActive }) => `flex items-center gap-4 rounded-2xl px-4 py-4 text-[15px] font-medium transition ${isActive ? 'bg-[#f3ecff] text-[#6c3df1] dark:bg-[#1f2740] dark:text-[#9db4ff]' : 'text-[#2f3749] hover:bg-[#f7f8fc] dark:text-[#c9d3e6] dark:hover:bg-[#151d2d]'}`}>
              <Settings className="h-5 w-5" />
              Configurações
            </NavLink>
            <button
              type="button"
              onClick={async () => {
                await auth.logout();
                onClose();
                navigate('/login', { replace: true });
              }}
              className="flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left text-[15px] font-medium text-[#2f3749] transition hover:bg-[#f7f8fc] dark:text-[#c9d3e6] dark:hover:bg-[#151d2d]"
            >
              <LogOut className="h-5 w-5" />
              Sair
            </button>
          </nav>
        </div>

        <div className="p-4">
          <button type="button" onClick={toggleTheme} className="flex w-full items-center justify-between rounded-2xl border border-[#e8edf5] px-4 py-4 dark:border-[#1c2436]">
            <div className="flex items-center gap-3 text-[#2f3749]">
              {theme === 'dark' ? <Sun className="h-5 w-5 text-[#ffbf2f]" /> : <Moon className="h-5 w-5" />}
              <span className="text-[15px] font-medium dark:text-[#c9d3e6]">{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
            </div>
            <div className={`relative h-7 w-12 rounded-full ${theme === 'dark' ? 'bg-[#6c3df1]' : 'bg-[#eef1f6]'}`}>
              <div className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${theme === 'dark' ? 'left-6' : 'right-1'}`} />
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}
