import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface Toast { id: string; type: 'success' | 'error'; title: string; description?: string }
interface ToastContextValue { success: (title: string, description?: string) => void; error: (title: string, description?: string) => void }

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((type: Toast['type'], title: string, description?: string) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, type, title, description }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3500);
  }, []);
  const value = useMemo(() => ({ success: (title: string, description?: string) => add('success', title, description), error: (title: string, description?: string) => add('error', title, description) }), [add]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[60] space-y-3">
        {toasts.map((toast) => {
          const Icon = toast.type === 'success' ? CheckCircle : XCircle;
          return <div key={toast.id} className="flex w-80 gap-3 rounded-xl border bg-card p-4 shadow-lg"><Icon className={`h-5 w-5 ${toast.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`} /><div className="flex-1"><div className="font-semibold">{toast.title}</div>{toast.description && <div className="text-sm text-muted-foreground">{toast.description}</div>}</div><button onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}><X className="h-4 w-4" /></button></div>;
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return context;
}
