import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, ChevronDown, Menu, Moon, Sun } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationsContext';

export function Navbar({ onMenuToggle, theme, onThemeToggle }: { onMenuToggle: () => void; theme: 'light' | 'dark'; onThemeToggle: () => void }) {
  void theme;
  void onThemeToggle;

  const location = useLocation();
  const { notifications, unreadCount, isLoading, isRead, markAllAsRead, markAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const title = location.pathname === '/weather'
    ? 'Clima'
    : location.pathname === '/users'
      ? 'Usuários'
      : location.pathname === '/settings'
        ? 'Configurações'
        : 'Dashboard';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    }

    if (open) window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const visibleNotifications = useMemo(() => notifications.slice(0, 6), [notifications]);

  return (
    <header className="sticky top-0 z-20 flex h-[92px] items-center justify-between border-b border-[#ebeff6] bg-white px-8 dark:border-[#1b2436] dark:bg-[#101725]">
      <div className="flex items-center gap-6">
        <button onClick={onMenuToggle} className="rounded-2xl p-2 text-[#6c3df1] lg:hidden">
          <Menu className="h-7 w-7" />
        </button>
        <button onClick={onMenuToggle} className="hidden rounded-2xl p-2 text-[#6c3df1] lg:block">
          <Menu className="h-8 w-8" />
        </button>
        <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[#181d27] dark:text-white">{title}</h1>
      </div>

      <div className="flex items-center gap-7">
        <button onClick={onThemeToggle} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dde5f2] bg-white text-[#5e6a84] shadow-sm dark:border-[#263047] dark:bg-[#131b2b] dark:text-[#cbd5e1]">
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
            <div className="absolute right-0 top-12 z-30 w-[380px] rounded-[22px] border border-[#e8edf5] bg-white p-4 shadow-[0_22px_60px_rgba(92,113,146,0.18)] dark:border-[#1c2436] dark:bg-[#131b2b]">
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

        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(180deg,#f1c8a0_0%,#c97c4e_100%)] text-sm font-semibold text-white">
            RS
          </div>
          <div className="flex items-center gap-3 text-[15px] text-[#181d27] dark:text-white">
            <span>Olá, Ricardo</span>
            <ChevronDown className="h-5 w-5" />
          </div>
        </div>
      </div>
    </header>
  );
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
