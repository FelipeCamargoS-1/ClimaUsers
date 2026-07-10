import { NavLink } from 'react-router-dom';
import { CloudSun, LayoutDashboard, Users, X } from 'lucide-react';

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const items = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Lista de Usuários', path: '/users', icon: Users },
    { name: 'Consulta do Clima', path: '/weather', icon: CloudSun },
  ];
  return (
    <>
      {isOpen && <div onClick={onClose} className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden" />}
      <aside className={`fixed bottom-0 left-0 top-0 z-40 flex w-64 flex-col justify-between border-r bg-card/80 p-4 backdrop-blur-xl transition-transform lg:static lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          <div className="mb-8 flex justify-end">
            <button className="lg:hidden" onClick={onClose}><X className="h-5 w-5" /></button>
          </div>
          <nav className="space-y-2">
            {items.map((item) => {
              const Icon = item.icon;
              return <NavLink key={item.path} to={item.path} onClick={onClose} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${isActive ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}><Icon className="h-5 w-5" />{item.name}</NavLink>;
            })}
          </nav>
        </div>
        <div className="border-t pt-4 text-center text-xs text-muted-foreground">Versão 1.0</div>
      </aside>
    </>
  );
}

