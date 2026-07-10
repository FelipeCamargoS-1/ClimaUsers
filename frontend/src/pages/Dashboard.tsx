import { Link } from 'react-router-dom';
import { ArrowUpRight, BarChart3, CloudSun, Droplets, Gauge, Plus, Search, Thermometer, TrendingUp, Users, Wind } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUsersList } from '../hooks/useUsers';
import { useWeatherQuery } from '../hooks/useWeather';

export function Dashboard() {
  const { data: usersData, isLoading: usersLoading } = useUsersList({ page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' });
  const spWeather = useWeatherQuery('São Paulo');
  const rjWeather = useWeatherQuery('Rio de Janeiro');
  const dfWeather = useWeatherQuery('Brasília');
  const totalUsers = usersData?.pagination?.total ?? 0;
  const users = usersData?.data ?? [];
  const mainWeather = spWeather.data;
  const hourly = mainWeather?.temperaturasPorHora?.filter((_, index) => index % 3 === 0).slice(0, 8) ?? [];
  const maxHourlyTemp = Math.max(...hourly.map((hour) => hour.temperatura), 1);
  const forecast = mainWeather?.previsaoCompleta ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-full rounded-[28px] bg-[#f7f8fb] p-4 text-[#1f2937] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)] dark:bg-[#0f172a] dark:text-slate-100 md:p-6">
      <section className="rounded-[26px] border border-white bg-white px-5 py-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 md:px-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-[#f1f3ff] px-3 py-1 text-xs font-semibold text-[#5b5ce2]">Usuários e clima</div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Acompanhe os usuários cadastrados e a previsão das principais cidades brasileiras.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/users" className="inline-flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900">
              <Plus className="h-4 w-4" />
              Novo usuário
            </Link>
            <Link to="/weather" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#5b5ce2] px-4 text-sm font-semibold text-white">
              <Search className="h-4 w-4" />
              Consultar clima
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Usuários" value={usersLoading ? '...' : totalUsers.toLocaleString('pt-BR')} detail="Total cadastrado" icon={Users} />
        <Metric label="São Paulo" value={mainWeather ? `${mainWeather.temperatura}°C` : '...'} detail={mainWeather?.condicao ?? 'Carregando clima'} icon={CloudSun} />
        <Metric label="Umidade" value={mainWeather ? `${mainWeather.umidade}%` : '...'} detail={mainWeather ? `${mainWeather.cidade}, ${mainWeather.estado}` : 'Aguardando dados'} icon={Droplets} />
        <Metric label="Vento" value={mainWeather ? `${mainWeather.vento} km/h` : '...'} detail={mainWeather ? `Sensação de ${mainWeather.sensacaoTermica}°C` : 'Aguardando dados'} icon={Wind} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-12">
        <div className="rounded-[26px] border border-white bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 xl:col-span-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Clima agora</p>
              <h2 className="mt-1 text-xl font-bold">{mainWeather ? `${mainWeather.cidade}, ${mainWeather.estado}` : 'Carregando cidade'}</h2>
            </div>
            <Link to="/weather" className="inline-flex items-center gap-1 text-sm font-semibold text-[#5b5ce2]">
              Ver detalhes <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-[260px_1fr]">
            <div className="rounded-[24px] bg-[#f4f6ff] p-5 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Agora</span>
                {mainWeather?.icone && <img src={mainWeather.icone} alt={mainWeather.condicao} className="h-12 w-12" />}
              </div>
              <div className="mt-8 text-6xl font-black">{mainWeather?.temperatura ?? '--'}<span className="text-2xl text-slate-400">°C</span></div>
              <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{mainWeather?.condicao ?? 'Aguardando dados'}</p>
            </div>
            <div className="rounded-[24px] border p-5 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold">Temperatura por hora</h3>
                  <p className="text-xs text-slate-400">Variação ao longo do dia</p>
                </div>
                <BarChart3 className="h-5 w-5 text-[#5b5ce2]" />
              </div>
              <div className="mt-6 flex h-40 items-end gap-3">
                {hourly.map((hour) => (
                  <div key={hour.hora} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-400">{hour.temperatura}°</span>
                    <div className="flex h-28 w-full items-end rounded-full bg-[#eef0f6] p-1 dark:bg-slate-800">
                      <div className="w-full rounded-full bg-[#5b5ce2]" style={{ height: `${Math.max((hour.temperatura / maxHourlyTemp) * 100, 18)}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400">{hour.hora}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <aside className="grid gap-5 xl:col-span-4">
          <div className="rounded-[26px] border border-white bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Condições</h2>
              <Gauge className="h-5 w-5 text-[#5b5ce2]" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Mini label="Sensação" value={mainWeather ? `${mainWeather.sensacaoTermica}°C` : '--'} icon={Thermometer} />
              <Mini label="Vento" value={mainWeather ? `${mainWeather.vento} km/h` : '--'} icon={Wind} />
              <Mini label="Umidade" value={mainWeather ? `${mainWeather.umidade}%` : '--'} icon={Droplets} />
              <Mini label="Pressão" value={mainWeather ? `${mainWeather.pressao} hPa` : '--'} icon={Gauge} />
            </div>
          </div>
          <div className="rounded-[26px] bg-[#151821] p-5 text-white">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Outras cidades</h2>
              <TrendingUp className="h-5 w-5 text-emerald-300" />
            </div>
            <City name="São Paulo" temp={spWeather.data?.temperatura} condition={spWeather.data?.condicao} />
            <City name="Rio de Janeiro" temp={rjWeather.data?.temperatura} condition={rjWeather.data?.condicao} />
            <City name="Brasília" temp={dfWeather.data?.temperatura} condition={dfWeather.data?.condicao} />
          </div>
        </aside>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-12">
        <div className="rounded-[26px] border border-white bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 xl:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Usuários recentes</h2>
            <Link to="/users" className="text-sm font-semibold text-[#5b5ce2]">Ver todos</Link>
          </div>
          <div className="mt-4 divide-y dark:divide-slate-800">
            {users.length ? users.map((user) => (
              <div key={user.id} className="flex justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-slate-400">{user.email}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{new Date(user.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            )) : <p className="py-8 text-center text-sm text-slate-400">Nenhum usuário encontrado.</p>}
          </div>
        </div>
        <div className="rounded-[26px] border border-white bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 xl:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Próximos dias</h2>
            <CloudSun className="h-5 w-5 text-[#5b5ce2]" />
          </div>
          <div className="mt-4 space-y-3">
            {forecast.length ? forecast.map((day) => (
              <div key={day.data} className="flex items-center justify-between rounded-2xl bg-[#f7f8fb] px-4 py-3 dark:bg-slate-800">
                <div className="flex items-center gap-3">
                  {day.icone && <img src={day.icone} alt={day.condicao} className="h-9 w-9" />}
                  <div>
                    <p className="font-semibold">{day.data}</p>
                    <p className="text-xs text-slate-400">{day.condicao}</p>
                  </div>
                </div>
                <b>{day.minima}° / {day.maxima}°</b>
              </div>
            )) : <p className="py-8 text-center text-sm text-slate-400">Previsão indisponível no momento.</p>}
          </div>
        </div>
      </section>
    </motion.div>
  );
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Users }) {
  return <div className="rounded-[22px] border border-white bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.055)] dark:border-slate-800 dark:bg-slate-900"><div className="flex justify-between"><div><p className="text-xs font-semibold uppercase text-slate-400">{label}</p><p className="text-2xl font-bold">{value}</p></div><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#5b5ce2]"><Icon className="h-5 w-5" /></div></div><p className="mt-4 text-xs font-semibold text-slate-400">{detail}</p></div>;
}

function Mini({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Thermometer }) {
  return <div className="rounded-2xl bg-[#f7f8fb] p-4 dark:bg-slate-800"><Icon className="h-4 w-4 text-[#5b5ce2]" /><p className="mt-3 text-xs text-slate-400">{label}</p><p className="font-bold">{value}</p></div>;
}

function City({ name, temp, condition }: { name: string; temp?: number; condition?: string }) {
  return <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-3 py-3 text-sm"><span className="min-w-0"><span className="block font-semibold">{name}</span><span className="block truncate text-xs text-white/55">{condition ?? 'Carregando'}</span></span><b className="shrink-0">{temp ? `${temp}°C` : '--'}</b></div>;
}
