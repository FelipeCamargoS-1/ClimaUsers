import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, ChevronDown, LogOut, Menu, Moon, Settings, Sun, UserCircle2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationsContext';
import { useAuth } from '../../context/AuthContext';

export function Navbar({ onMenuToggle, theme, onThemeToggle }: { onMenuToggle: () => void; theme: 'light' | 'dark'; onThemeToggle: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const { notifications, unreadCount, isLoading, isRead, markAllAsRead, markAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const title = location.pathname === '/weather'
    ? 'Clima'
    : location.pathname === '/users'
      ? 'Usuários'
      : location.pathname === '/profile'
        ? 'Perfil'
      : location.pathname === '/settings'
        ? 'Configurações'
        : 'Dashboard';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
    }

    if (open || userMenuOpen) window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [open, userMenuOpen]);

  const visibleNotifications = useMemo(() => notifications.slice(0, 6), [notifications]);
  const userName = auth.user?.name ?? 'Usuário';
  const userEmail = auth.user?.email ?? '';
  const userInitials = createInitials(userName);

  return (
    <header className="sticky top-0 z-20 flex h-[72px] shrink-0 items-center justify-between border-b border-[#ebeff6] bg-white px-3 dark:border-[#202d42] dark:bg-[#101827] sm:h-[82px] sm:px-6 xl:h-[92px] xl:px-8">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <button onClick={onMenuToggle} aria-label="Abrir menu" className="shrink-0 rounded-2xl p-2 text-[#6c3df1] transition hover:bg-[#f3ecff] dark:hover:bg-[#1f2740]">
          <Menu className="h-6 w-6 sm:h-7 sm:w-7" />
        </button>
        <h1 className="truncate text-[20px] font-semibold tracking-[-0.03em] text-[#181d27] dark:text-white sm:text-[24px] xl:text-[26px]">{title}</h1>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4 xl:gap-7">
        <button onClick={onThemeToggle} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#dde5f2] bg-white text-[#5e6a84] shadow-sm dark:border-[#263047] dark:bg-[#131b2b] dark:text-[#cbd5e1] sm:h-11 sm:w-11">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <div className="relative" ref={panelRef}>
          <button onClick={() => setOpen((current) => !current)} className="relative text-[#3b4457] dark:text-[#dbe4f4]">
            <Bell className="h-7 w-7" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#6c3df1] px-1 text-[11px] font-semibold text-white">
                {Math.min(unreadCount, 9)}
              </span>
            ) : null}
          </button>

          {open ? (
            <div className="fixed inset-x-3 top-[68px] z-30 max-h-[calc(100dvh-80px)] overflow-y-auto rounded-[22px] border border-[#e8edf5] bg-white p-4 shadow-[0_22px_60px_rgba(92,113,146,0.18)] dark:border-[#1c2436] dark:bg-[#131b2b] sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[min(380px,calc(100vw-2rem))]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[17px] font-semibold text-[#181d27] dark:text-white">Notificações</div>
                  <div className="mt-1 text-[13px] text-[#748099] dark:text-[#94a3b8]">
                    {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia'}
                  </div>
                </div>
                {notifications.length ? (
                  <button type="button" onClick={markAllAsRead} className="text-[13px] font-medium text-[#6c3df1]">
                    Marcar todas como lidas
                  </button>
                ) : null}
              </div>

              <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="rounded-2xl border border-[#edf1f7] px-4 py-4 dark:border-[#20293d]">
                      <div className="h-4 w-32 rounded-full bg-[#eef2f8]" />
                      <div className="mt-3 h-3 w-full rounded-full bg-[#f3f6fb]" />
                      <div className="mt-2 h-3 w-28 rounded-full bg-[#f3f6fb]" />
                    </div>
                  ))
                ) : visibleNotifications.length ? (
                  visibleNotifications.map((notification) => (
                    <Link
                      key={notification.id}
                      to={notification.href}
                      onClick={() => {
                        markAsRead(notification.id);
                        setOpen(false);
                      }}
                      className={`block rounded-2xl border px-4 py-4 transition ${
                        isRead(notification.id) ? 'border-[#edf1f7] bg-white dark:border-[#20293d] dark:bg-[#131b2b]' : 'border-[#e3d7ff] bg-[#faf7ff] dark:border-[#2b3560] dark:bg-[#18203a]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold text-[#1f2738] dark:text-white">{notification.title}</div>
                          <div className="mt-1 text-[13px] leading-5 text-[#606b82] dark:text-[#9eb0c8]">{notification.description}</div>
                        </div>
                        {!isRead(notification.id) ? <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#6c3df1]" /> : null}
                      </div>
                      <div className="mt-3 text-[12px] text-[#8b95aa] dark:text-[#7f90a8]">{formatNotificationDate(notification.timestamp)}</div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-[#edf1f7] px-4 py-8 text-center text-[14px] text-[#748099] dark:border-[#20293d] dark:text-[#94a3b8]">
                    Nenhuma notificação disponível no momento.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative" ref={userMenuRef}>
          <button onClick={() => setUserMenuOpen((current) => !current)} className="flex items-center gap-4 rounded-[18px] px-2 py-2 transition hover:bg-[#f7f9fc] dark:hover:bg-[#172132]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,#f1c8a0_0%,#c97c4e_100%)] text-sm font-semibold text-white sm:h-12 sm:w-12">
              {userInitials}
            </div>
            <div className="hidden text-left sm:block">
              <div className="text-[15px] font-semibold text-[#181d27] dark:text-[#f5f7fb]">{userName}</div>
              <div className="mt-0.5 max-w-[220px] truncate text-[13px] text-[#73809a] dark:text-[#9eb0c8]">{userEmail}</div>
            </div>
            <ChevronDown className={`hidden h-5 w-5 text-[#5d6880] transition dark:text-[#c7d4e9] sm:block ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen ? (
            <div className="absolute right-0 top-14 z-30 w-[min(280px,calc(100vw-1.5rem))] rounded-[22px] border border-[#e8edf5] bg-white p-3 shadow-[0_22px_60px_rgba(92,113,146,0.18)] dark:border-[#243149] dark:bg-[#131d2d] sm:top-16">
              <Link to="/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px] font-medium text-[#1f2738] transition hover:bg-[#f7f9fc] dark:text-[#edf2fa] dark:hover:bg-[#172132]">
                <UserCircle2 className="h-4 w-4" />
                Meu perfil
              </Link>
              <Link to="/settings" onClick={() => setUserMenuOpen(false)} className="mt-1 flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px] font-medium text-[#1f2738] transition hover:bg-[#f7f9fc] dark:text-[#edf2fa] dark:hover:bg-[#172132]">
                <Settings className="h-4 w-4" />
                Configurações
              </Link>
              <button
                type="button"
                onClick={async () => {
                  setUserMenuOpen(false);
                  await auth.logout();
                  navigate('/login', { replace: true });
                }}
                className="mt-1 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[14px] font-medium text-[#d14343] transition hover:bg-[#fff5f5] dark:text-[#ff9a9a] dark:hover:bg-[#2a1820]"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function createInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
