import { Link } from 'react-router-dom';
import { CalendarDays, CloudSun, Eye, MapPin, Thermometer, UserPlus, Users } from 'lucide-react';
import { useUsersList } from '../hooks/useUsers';
import { useWeatherQuery } from '../hooks/useWeather';
import { useAuth } from '../context/AuthContext';

export function Dashboard() {
  const { user } = useAuth();
  const { data: usersData, isLoading: usersLoading } = useUsersList({ page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' });
  const weather = useWeatherQuery({ city: 'Curitiba', stateCode: 'PR', stateName: 'Parana' });

  const users = usersData?.data ?? [];
  const totalUsers = usersData?.pagination?.total ?? 0;
  const currentWeather = weather.data;
  const formattedNow = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
  const formattedDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());

  return (
    <div className="space-y-7">
      <section>
        <h1 className="text-[27px] font-semibold tracking-[-0.03em] text-[#181d27] dark:text-[#f6f8fc] sm:text-[30px] xl:text-[34px]">Bem-vindo de volta, {firstName(user?.name) ?? 'usuário'}! <span className="text-[26px] sm:text-[30px]">👋</span></h1>
        <p className="mt-3 text-[15px] text-[#5e677b] dark:text-[#a9b5c9]">Aqui está um resumo geral da sua aplicação.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
        <MetricCard
          icon={Users}
          iconClassName="bg-[linear-gradient(180deg,#f2e9ff_0%,#f8f4ff_100%)] text-[#6c3df1] dark:bg-[linear-gradient(180deg,#332854_0%,#282340_100%)] dark:text-[#c2afff]"
          label="Total de usuários"
          value={usersLoading ? '...' : totalUsers.toLocaleString('pt-BR')}
          accent="+12 novos esta semana ↗"
          accentClassName="text-[#16a34a]"
        />
        <MetricCard
          icon={Thermometer}
          iconClassName="bg-[linear-gradient(180deg,#e4f0ff_0%,#f3f8ff_100%)] text-[#246bff] dark:bg-[linear-gradient(180deg,#203a5c_0%,#1d2d46_100%)] dark:text-[#78a9ff]"
          label="Temperatura atual"
          value={currentWeather ? `${currentWeather.temperatura}°C` : '--'}
          accent={currentWeather ? `Sensação térmica ${currentWeather.sensacaoTermica}°C` : 'Carregando clima'}
        />
        <MetricCard
          icon={MapPin}
          iconClassName="bg-[linear-gradient(180deg,#e6f8ea_0%,#f2fbf4_100%)] text-[#16a34a] dark:bg-[linear-gradient(180deg,#1d412d_0%,#1a3227_100%)] dark:text-[#6ed797]"
          label="Cidade consultada"
          value={currentWeather ? `${currentWeather.cidade}, PR` : '--'}
          valueClassName="text-[#16a34a]"
          accent={`Última atualização: ${formattedNow}`}
        />
        <MetricCard
          icon={CalendarDays}
          iconClassName="bg-[linear-gradient(180deg,#fff1d9_0%,#fff8eb_100%)] text-[#f59e0b] dark:bg-[linear-gradient(180deg,#49351c_0%,#392c1c_100%)] dark:text-[#f8bd55]"
          label="Última atualização"
          value={formattedNow}
          valueClassName="text-[#f28c13]"
          accent={formattedDate}
        />
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.58fr)_minmax(360px,0.82fr)]">
        <div className="rounded-[26px] border border-[#e8edf5] bg-white shadow-[0_18px_45px_rgba(120,138,165,0.08)] dark:border-[#243149] dark:bg-[#121a29] dark:shadow-[0_20px_60px_rgba(2,8,20,0.42)]">
          <div className="flex items-center justify-between border-b border-[#edf1f7] px-6 py-5 dark:border-[#26334a]">
            <h2 className="text-[18px] font-semibold text-[#1c2333] dark:text-[#f6f8fc]">Usuários recentes</h2>
            <Link to="/users" className="text-[15px] font-medium text-[#6c3df1]">Ver todos</Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-[#edf1f7] bg-white text-left dark:border-[#26334a] dark:bg-[#151f30]">
                <tr className="text-[15px] font-medium text-[#4b5567] dark:text-[#aebbd0]">
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Data de cadastro</th>
                  <th className="px-6 py-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.length ? users.map((user, index) => (
                  <tr key={user.id} className="border-b border-[#f1f4f9] text-[15px] text-[#222a3c] last:border-b-0 dark:border-[#222f45] dark:text-[#eef2f8]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${avatarTone(index)}`}>
                          {initials(user.name)}
                        </div>
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#3d465a] dark:text-[#b3bfd2]">{user.email}</td>
                    <td className="px-6 py-4 text-[#3d465a] dark:text-[#b3bfd2]">{formatDateTime(user.createdAt)}</td>
                    <td className="px-6 py-4">
                      <button type="button" className="flex h-9 w-14 items-center justify-center rounded-xl border border-[#d8caff] text-[#6c3df1] dark:border-[#4d4380] dark:bg-[#1c2740] dark:text-[#bda8ff]">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-[#7f889a] dark:text-[#94a3bc]">Nenhum usuário encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-6">
            <Link to="/users" className="mx-auto flex h-12 w-fit items-center justify-center gap-3 rounded-2xl bg-[linear-gradient(180deg,#f0e8ff_0%,#ede5ff_100%)] px-8 text-[15px] font-semibold text-[#6c3df1] dark:bg-[linear-gradient(180deg,#272349_0%,#211e3d_100%)] dark:text-[#c2afff]">
              Ver todos os usuários
              <span className="text-lg">›</span>
            </Link>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[26px] border border-[#e8edf5] bg-white p-5 shadow-[0_18px_45px_rgba(120,138,165,0.08)] dark:border-[#243149] dark:bg-[#121a29] dark:shadow-[0_20px_60px_rgba(2,8,20,0.42)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 whitespace-nowrap text-[18px] font-semibold text-[#1c2333] dark:text-[#f6f8fc]">
                <CloudSun className="h-5 w-5 shrink-0 text-[#444b5d] dark:text-[#b7c3d8]" />
                Clima recente
              </div>
              <Link to="/weather" className="whitespace-nowrap text-[14px] font-medium text-[#6c3df1] dark:text-[#a98cff]">Ver previsão completa</Link>
            </div>

            <div className="mt-5 rounded-[22px] bg-[linear-gradient(180deg,#eaf4ff_0%,#f6fbff_100%)] p-5 dark:bg-[linear-gradient(180deg,#172a42_0%,#162337_100%)]">
              <div className="space-y-6">
                <div className="flex min-w-0 items-center gap-4">
                  {currentWeather?.icone ? <img src={currentWeather.icone} alt={currentWeather.condicao} className="h-20 w-20 shrink-0 sm:h-24 sm:w-24" /> : <CloudSun className="h-20 w-20 shrink-0 text-[#ffbf2f]" />}
                  <div className="min-w-0">
                    <div className="whitespace-nowrap text-[38px] font-semibold leading-none text-[#171d29] dark:text-[#f7f9fc] sm:text-[46px]">{currentWeather?.temperatura ?? '--'}°C</div>
                    <div className="mt-3 text-[15px] font-semibold text-[#1c2333] dark:text-[#eaf0f8]">Curitiba, PR</div>
                    <div className="mt-1 truncate text-[15px] text-[#505a70] dark:text-[#aebbd0]">{currentWeather?.condicao ?? 'Carregando'}</div>
                  </div>
                </div>

                <div className="space-y-3 border-t border-[#d7e5f4] pt-5 text-[14px] text-[#2a3347] dark:border-[#2a405a] dark:text-[#c7d1e1]">
                  <InfoRow label="Sensação térmica" value={currentWeather ? `${currentWeather.sensacaoTermica}°C` : '--'} />
                  <InfoRow label="Umidade" value={currentWeather ? `${currentWeather.umidade}%` : '--'} />
                  <InfoRow label="Vento" value={currentWeather ? `${currentWeather.vento} km/h` : '--'} />
                  <InfoRow label="Máxima" value={currentWeather?.previsaoCompleta?.[0] ? `${currentWeather.previsaoCompleta[0].maxima}°C` : '--'} />
                  <InfoRow label="Mínima" value={currentWeather?.previsaoCompleta?.[0] ? `${currentWeather.previsaoCompleta[0].minima}°C` : '--'} />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-[#e8edf5] bg-white p-5 shadow-[0_18px_45px_rgba(120,138,165,0.08)] dark:border-[#243149] dark:bg-[#121a29] dark:shadow-[0_20px_60px_rgba(2,8,20,0.42)]">
            <h2 className="text-[18px] font-semibold text-[#1c2333] dark:text-[#f6f8fc]">Ações rápidas</h2>

            <div className="mt-5 grid gap-4">
              <Link to="/users" className="flex min-w-0 items-center gap-4 rounded-[20px] bg-[linear-gradient(135deg,#f3e9ff_0%,#fbf7ff_100%)] p-4 dark:bg-[linear-gradient(135deg,#272044_0%,#1d2438_100%)]">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#e9dcff] text-[#6c3df1] dark:bg-[#352b58] dark:text-[#c1adff]">
                  <UserPlus className="h-8 w-8" />
                </div>
                <div className="min-w-0">
                  <div className="whitespace-nowrap text-[16px] font-semibold text-[#6c3df1]">Novo usuário</div>
                  <div className="mt-1 text-[14px] text-[#505a70] dark:text-[#aebbd0]">Cadastrar novo usuário</div>
                </div>
              </Link>

              <Link to="/weather" className="flex min-w-0 items-center gap-4 rounded-[20px] bg-[linear-gradient(135deg,#e9f2ff_0%,#f5f9ff_100%)] p-4 dark:bg-[linear-gradient(135deg,#182d49_0%,#1a2538_100%)]">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#d9e9ff] text-[#246bff] dark:bg-[#213a5d] dark:text-[#75a7ff]">
                  <CloudSun className="h-8 w-8" />
                </div>
                <div className="min-w-0">
                  <div className="whitespace-nowrap text-[16px] font-semibold text-[#246bff]">Consultar clima</div>
                  <div className="mt-1 text-[14px] text-[#505a70] dark:text-[#aebbd0]">Ver clima de uma cidade</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function firstName(name?: string) {
  return name?.trim().split(/\s+/)[0];
}

function MetricCard({
  icon: Icon,
  iconClassName,
  label,
  value,
  accent,
  accentClassName,
  valueClassName,
}: {
  icon: typeof Users;
  iconClassName: string;
  label: string;
  value: string;
  accent: string;
  accentClassName?: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#e8edf5] bg-white p-5 shadow-[0_18px_45px_rgba(120,138,165,0.08)] dark:border-[#243149] dark:bg-[#121a29] dark:shadow-[0_20px_60px_rgba(2,8,20,0.42)] sm:p-6">
      <div className="flex items-center gap-5">
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full sm:h-20 sm:w-20 ${iconClassName}`}>
          <Icon className="h-8 w-8 sm:h-9 sm:w-9" />
        </div>
        <div>
          <div className="text-[15px] text-[#4f586c] dark:text-[#aebbd0]">{label}</div>
          <div className={`mt-2 text-[24px] font-semibold text-[#6c3df1] ${valueClassName ?? ''}`}>{value}</div>
          <div className={`mt-2 text-[15px] dark:text-[#aebbd0] ${accentClassName ?? 'text-[#505a70]'}`}>{accent}</div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="whitespace-nowrap text-[#424c61] dark:text-[#b4c0d3]">{label}</span>
      <span className="whitespace-nowrap font-semibold text-[#171d29] dark:text-[#f3f6fb]">{value}</span>
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

function avatarTone(index: number) {
  const tones = [
    'bg-[#efe7ff] text-[#6c3df1]',
    'bg-[#e8f0ff] text-[#246bff]',
    'bg-[#e3f7e8] text-[#16a34a]',
    'bg-[#fff3db] text-[#f59e0b]',
    'bg-[#ffe7e7] text-[#ef4444]',
  ];
  return tones[index % tones.length];
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
