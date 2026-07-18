import { CalendarClock, KeyRound, Mail, ShieldCheck, UserCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  const createdAt = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(user.createdAt));

  const updatedAt = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(user.updatedAt));

  return (
    <div className="space-y-7">
      <section>
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#181d27] dark:text-[#f5f7fb] sm:text-[34px]">Meu perfil</h1>
        <p className="mt-3 text-[15px] text-[#5e677b] dark:text-[#aeb8cb]">Dados reais da sessão autenticada e preferências da conta.</p>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
        <div className="rounded-[28px] border border-[#e8edf5] bg-white p-5 shadow-[0_18px_45px_rgba(120,138,165,0.08)] dark:border-[#243149] dark:bg-[#121a29] dark:shadow-[0_20px_60px_rgba(2,8,20,0.42)] sm:p-7">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-[28px] bg-[linear-gradient(180deg,#ede4ff_0%,#f8f5ff_100%)] text-[#6c3df1] dark:bg-[linear-gradient(180deg,#233054_0%,#1b2640_100%)] dark:text-[#bfd0ff]">
              <span className="text-[34px] font-semibold tracking-[-0.04em]">{initials(user.name)}</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#7b86a0] dark:text-[#8ea1c4]">Conta autenticada</div>
              <h2 className="mt-3 truncate text-[24px] font-semibold tracking-[-0.04em] text-[#181d27] dark:text-[#f7f9fc] sm:text-[30px]">{user.name}</h2>
              <p className="mt-2 truncate text-[16px] text-[#5c667b] dark:text-[#b5c0d3]">{user.email}</p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#eef8f1] px-4 py-2 text-[13px] font-semibold text-[#15803d] dark:bg-[#183424] dark:text-[#7ee0a4]">
                <ShieldCheck className="h-4 w-4" />
                Sessão ativa e protegida
              </div>
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <ProfileMetric icon={UserCircle2} label="Nome completo" value={user.name} />
            <ProfileMetric icon={Mail} label="E-mail" value={user.email} />
            <ProfileMetric icon={CalendarClock} label="Conta criada em" value={createdAt} />
            <ProfileMetric icon={KeyRound} label="Última sincronização" value={updatedAt} />
          </div>
        </div>

        <div>
          <div className="rounded-[28px] border border-[#e8edf5] bg-white p-5 shadow-[0_18px_45px_rgba(120,138,165,0.08)] dark:border-[#243149] dark:bg-[#121a29] dark:shadow-[0_20px_60px_rgba(2,8,20,0.42)] sm:p-7">
            <h2 className="text-[21px] font-semibold text-[#1c2333] dark:text-[#f6f8fc]">Preferências rápidas</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <MiniCard title="Tema" value="Sincronizado com sua escolha atual" />
              <MiniCard title="Notificações" value="Eventos de usuário e clima ativos" />
              <MiniCard title="Conta" value="Administrador autenticado" />
              <MiniCard title="Integração" value="Sessão ligada ao backend real" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserCircle2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] bg-[#f7f9fc] px-4 py-4 dark:bg-[#182233]">
      <div className="flex items-center gap-3 text-[#72809b] dark:text-[#90a3c1]">
        <Icon className="h-4 w-4" />
        <span className="text-[13px] font-medium">{label}</span>
      </div>
      <div className="mt-3 text-[15px] font-semibold text-[#1c2333] dark:text-[#f5f7fb]">{value}</div>
    </div>
  );
}

function MiniCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[#e9eef6] bg-white px-4 py-4 dark:border-[#243149] dark:bg-[#172132]">
      <div className="text-[13px] font-medium text-[#7c879d] dark:text-[#8fa2c0]">{title}</div>
      <div className="mt-2 text-[15px] font-semibold leading-6 text-[#1d2433] dark:text-[#f5f7fb]">{value}</div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default Profile;
