import { Menu, Moon, Sun, UserCircle } from 'lucide-react';

export function Navbar({ onMenuToggle, theme, onThemeToggle }: { onMenuToggle: () => void; theme: 'light' | 'dark'; onThemeToggle: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/70 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <button onClick={onMenuToggle} className="rounded-lg border p-2 lg:hidden"><Menu className="h-5 w-5" /></button>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onThemeToggle} title="Alternar tema" className="rounded-xl border p-2.5 text-muted-foreground hover:text-foreground">{theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
        <div className="hidden text-right sm:block"><div className="text-xs font-bold">Administrador</div><div className="text-[10px] text-muted-foreground">admin@empresa.com</div></div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white"><UserCircle className="h-5 w-5" /></div>
      </div>
    </header>
  );
}


