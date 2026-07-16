import { Bell, Shield, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Settings() {
  const { user } = useAuth();
  const lastAccess = user?.updatedAt
    ? new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(user.updatedAt))
    : '--';

  return (
    <div className="space-y-7">
      <section>
        <h1 className="text-[34px] font-semibold tracking-[-0.03em] text-[#181d27] dark:text-[#f5f7fb]">Configurações</h1>
        <p className="mt-3 text-[15px] text-[#5e677b] dark:text-[#aab6ca]">Ajustes básicos da conta, preferências e notificações do sistema.</p>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="rounded-[26px] border border-[#e8edf5] bg-white p-6 shadow-[0_18px_45px_rgba(120,138,165,0.08)] dark:border-[#243149] dark:bg-[#121a29] dark:shadow-[0_20px_60px_rgba(2,8,20,0.42)]">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f3ecff] text-[#6c3df1]">
              <UserCircle className="h-8 w-8" />
            </div>
            <div>
                <h2 className="text-[20px] font-semibold text-[#1c2333] dark:text-[#f5f7fb]">Perfil</h2>
                <p className="mt-1 text-[14px] text-[#6d778d] dark:text-[#a8b3c8]">Informações exibidas no painel administrativo.</p>
              </div>
            </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Nome" value={user?.name ?? '--'} />
            <Field label="E-mail" value={user?.email ?? '--'} />
            <Field label="Função" value="Administrador" />
            <Field label="Último acesso" value={lastAccess} />
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[26px] border border-[#e8edf5] bg-white p-6 shadow-[0_18px_45px_rgba(120,138,165,0.08)] dark:border-[#243149] dark:bg-[#121a29] dark:shadow-[0_20px_60px_rgba(2,8,20,0.42)]">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef4ff] text-[#246bff]">
                <Bell className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-[20px] font-semibold text-[#1c2333] dark:text-[#f5f7fb]">Notificações</h2>
                <p className="mt-1 text-[14px] text-[#6d778d] dark:text-[#a8b3c8]">Defina como os eventos do sistema devem aparecer.</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <ToggleRow label="Novos usuários" description="Avisar quando um novo cadastro for criado." enabled />
              <ToggleRow label="Alertas meteorológicos" description="Mostrar notificações de clima importante." enabled />
              <ToggleRow label="Erros de integração" description="Avisar quando a API de clima falhar." enabled />
            </div>
          </div>

          <div className="rounded-[26px] border border-[#e8edf5] bg-white p-6 shadow-[0_18px_45px_rgba(120,138,165,0.08)] dark:border-[#243149] dark:bg-[#121a29] dark:shadow-[0_20px_60px_rgba(2,8,20,0.42)]">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ecfdf3] text-[#16a34a]">
                <Shield className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-[20px] font-semibold text-[#1c2333] dark:text-[#f5f7fb]">Segurança</h2>
                <p className="mt-1 text-[14px] text-[#6d778d] dark:text-[#a8b3c8]">Resumo rápido da autenticação configurada.</p>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-[15px] text-[#41506a] dark:text-[#c0cadc]">
              <div className="flex items-center justify-between rounded-2xl bg-[#f8fafc] px-4 py-4 dark:bg-[#182233]">
                <span>Conta Git ativa</span>
                <strong className="text-[#1c2333] dark:text-[#f5f7fb]">FelipeCamargoS-1</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f8fafc] px-4 py-4 dark:bg-[#182233]">
                <span>Autenticação SSH</span>
                <strong className="text-[#16a34a]">Conectada</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f8fafc] px-4 py-4 dark:bg-[#182233]">
      <div className="text-[13px] font-medium text-[#7b879c] dark:text-[#91a4c1]">{label}</div>
      <div className="mt-2 text-[15px] font-semibold text-[#1c2333] dark:text-[#f5f7fb]">{value}</div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
}: {
  label: string;
  description: string;
  enabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f8fafc] px-4 py-4 dark:bg-[#182233]">
      <div>
        <div className="text-[15px] font-semibold text-[#1c2333] dark:text-[#f5f7fb]">{label}</div>
        <div className="mt-1 text-[13px] text-[#6d778d] dark:text-[#a8b3c8]">{description}</div>
      </div>
      <div className={`relative h-7 w-12 rounded-full ${enabled ? 'bg-[#6c3df1]' : 'bg-[#e7ebf3]'}`}>
        <div className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${enabled ? 'right-1' : 'left-1'}`} />
      </div>
    </div>
  );
}
