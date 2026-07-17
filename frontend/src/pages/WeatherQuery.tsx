import { useMemo, useState } from 'react';
import { AlertCircle, BellRing, ChevronDown, CloudSun, Droplets, Eye, Gauge, MapPin, Search, Sunrise, Sunset, Wind } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { TemperatureChart } from '../components/weather/TemperatureChart';
import { Map } from '../components/weather/Map';
import { useBrazilCities, useBrazilStates } from '../hooks/useBrazilLocations';
import { useWeatherQuery } from '../hooks/useWeather';
import type { WeatherData } from '../types';

export function WeatherQuery() {
  const [stateCode, setStateCode] = useState('PR');
  const [selectedCity, setSelectedCity] = useState('Curitiba');
  const [submittedLocation, setSubmittedLocation] = useState({ city: 'Curitiba', stateCode: 'PR', stateName: 'Paraná' });

  const states = useBrazilStates();
  const selectedState = states.data?.find((state) => state.sigla === stateCode);
  const cities = useBrazilCities(selectedState?.id);
  const weather = useWeatherQuery(submittedLocation);

  const handleSubmit = () => {
    if (!selectedCity || !selectedState) return;
    setSubmittedLocation({ city: selectedCity, stateCode: selectedState.sigla, stateName: selectedState.nome });
  };

  return (
    <div className="space-y-4 pb-8">
      <header className="rounded-[30px] bg-white px-1 py-1">
        <div className="px-1 py-3 sm:px-2">
          <h1 className="text-[34px] font-semibold leading-none tracking-[-0.03em] text-[#18233b]">Consulta de Clima</h1>
          <p className="mt-3 text-[15px] text-[#63718d]">Escolha primeiro o estado e depois uma cidade da lista oficial do IBGE.</p>
        </div>
      </header>

      <section className="rounded-[24px] border border-[#dfe7f2] bg-white p-5 shadow-[0_16px_50px_rgba(134,154,185,0.12)]">
        <div className="grid gap-4 xl:grid-cols-[1fr_1.25fr_236px]">
          <div>
            <div className="mb-3 text-[14px] font-medium text-[#4c5872]">1. Escolha o estado</div>
            <label className="flex h-[54px] items-center gap-3 rounded-2xl border border-[#dbe4f0] bg-[#fbfdff] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <MapPin className="h-5 w-5 text-[#2f67f6]" />
              <select
                aria-label="Estado"
                value={stateCode}
                onChange={(event) => {
                  setStateCode(event.target.value);
                  setSelectedCity('');
                }}
                disabled={states.isLoading}
                className="w-full appearance-none bg-transparent text-[15px] text-[#24314d] outline-none"
              >
                <option value="">{states.isLoading ? 'Carregando estados...' : 'Selecione um estado'}</option>
                {states.data?.map((state) => <option key={state.id} value={state.sigla}>{state.nome} ({state.sigla})</option>)}
              </select>
              <ChevronDown className="h-5 w-5 text-[#7d88a1]" />
            </label>
          </div>

          <div>
            <div className="mb-3 text-[14px] font-medium text-[#4c5872]">2. Escolha a cidade</div>
            <label className="flex h-[54px] items-center gap-3 rounded-2xl border border-[#dbe4f0] bg-[#fbfdff] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <MapPin className="h-5 w-5 text-[#2f67f6]" />
              <select
                aria-label="Cidade"
                value={selectedCity}
                onChange={(event) => setSelectedCity(event.target.value)}
                disabled={!stateCode || cities.isLoading || cities.isError}
                className="w-full appearance-none bg-transparent text-[15px] text-[#24314d] outline-none"
              >
                <option value="">{cities.isLoading ? 'Carregando cidades...' : 'Selecione uma cidade'}</option>
                {cities.data?.map((city) => <option key={city.id} value={city.nome}>{city.nome}</option>)}
              </select>
              <ChevronDown className="h-5 w-5 text-[#7d88a1]" />
            </label>
          </div>

          <button
            type="button"
            disabled={!selectedCity || !selectedState || weather.isFetching}
            onClick={handleSubmit}
            className="mt-auto flex h-[54px] items-center justify-center gap-3 rounded-2xl bg-[#2f67f6] px-5 text-[18px] font-medium text-white shadow-[0_18px_30px_rgba(47,103,246,0.24)] transition hover:bg-[#255be7] disabled:cursor-not-allowed disabled:bg-[#9cb6f5]"
          >
            <Search className="h-5 w-5" />
            {weather.isFetching ? 'Consultando...' : 'Consultar'}
          </button>
        </div>

        {(states.isError || cities.isError) && (
          <p className="mt-4 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            Não foi possível carregar as localidades do IBGE. Tente novamente.
          </p>
        )}
      </section>

      {weather.isLoading ? <WeatherSkeleton /> : weather.isError ? <WeatherError error={weather.error} /> : weather.data ? <WeatherDashboard data={weather.data} /> : null}
    </div>
  );
}
function WeatherDashboard({ data }: { data: WeatherData }) {
  const hourly = useMemo(() => data.temperaturasPorHora.slice(0, 8), [data.temperaturasPorHora]);
  const nextDays = useMemo(() => data.previsaoCompleta.slice(0, 5), [data.previsaoCompleta]);
  const currentDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
  const currentTime = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
  const chanceByCondition = (condition: string) => {
    const normalized = condition.toLowerCase();
    if (normalized.includes('tempest')) return 90;
    if (normalized.includes('chuva')) return 70;
    if (normalized.includes('nublado')) return 20;
    return 0;
  };
  const visibility = data.condicao.toLowerCase().includes('chuva') ? '7 km' : '10 km';

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.62fr)_minmax(320px,0.72fr)]">
      <div className="min-w-0 space-y-4">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.52fr)_minmax(320px,0.72fr)]">
          <div className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(135deg,#2b75d7_0%,#7fa8d8_58%,#5078a9_100%)] p-6 text-white shadow-[0_24px_50px_rgba(78,123,184,0.25)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.16))]" />
            <div className="absolute inset-x-0 bottom-0 h-36 bg-[linear-gradient(180deg,rgba(31,62,98,0)_0%,rgba(24,46,75,0.22)_50%,rgba(22,39,63,0.34)_100%)]" />
            <div className="absolute bottom-0 left-0 right-0 h-28 bg-[radial-gradient(circle_at_20%_100%,#406d4c_0,#406d4c_22%,transparent_23%),radial-gradient(circle_at_40%_105%,#274860_0,#274860_24%,transparent_25%),radial-gradient(circle_at_63%_102%,#375e3f_0,#375e3f_20%,transparent_21%),radial-gradient(circle_at_84%_105%,#274860_0,#274860_20%,transparent_21%)] opacity-90" />
            <div className="absolute bottom-0 right-0 h-44 w-40 opacity-50">
              <div className="absolute bottom-0 left-8 h-28 w-20 rounded-t-[48px] border border-white/40" />
              <div className="absolute bottom-0 left-0 h-20 w-16 rounded-t-[36px] border border-white/40" />
              <div className="absolute bottom-0 right-0 h-24 w-16 rounded-t-[36px] border border-white/40" />
            </div>

            <div className="relative z-10">
              <div className="grid gap-5 md:grid-cols-[1.05fr_0.95fr]">
                <div>
                  <h2 className="text-[28px] font-semibold tracking-[-0.03em]">{data.cidade}, {stateToCode(data.estado)}</h2>
                  <p className="mt-2 text-[14px] capitalize text-white/88">{currentDate}</p>
                  <p className="text-[14px] text-white/88">{currentTime}</p>

                  <div className="mt-8 flex items-center gap-5">
                    {data.icone ? <img src={data.icone} alt={data.condicao} className="h-28 w-28 drop-shadow-[0_14px_30px_rgba(0,0,0,0.18)]" /> : <CloudSun className="h-24 w-24" />}
                    <div>
                      <div className="text-[64px] font-semibold leading-none">{data.temperatura}<span className="align-top text-[32px] font-medium">°C</span></div>
                      <div className="mt-2 text-[17px] font-medium text-white/95">{data.condicao}</div>
                      <div className="mt-1 text-[15px] text-white/82">Sensação térmica de {data.sensacaoTermica}°C</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MetricCard icon={Droplets} label="Umidade" value={`${data.umidade}%`} detail="" />
                  <MetricCard icon={Wind} label="Vento" value={`${data.vento}`} detail="km/h" suffix="NE" />
                  <MetricCard icon={Gauge} label="Pressão" value={`${data.pressao}`} detail="hPa" />
                  <MetricCard icon={Eye} label="Visibilidade" value={visibility} detail="" />
                  <MetricCard icon={Sunrise} label="Nascer do sol" value={data.nascerDoSol.replace(' AM', '')} detail="" />
                  <MetricCard icon={Sunset} label="Pôr do sol" value={data.porDoSol.replace(' PM', '')} detail="" />
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[26px] bg-white shadow-[0_18px_44px_rgba(124,145,178,0.16)]">
            <div className="h-[306px] p-0">
              <Map latitude={data.latitude} longitude={data.longitude} city={data.cidade} state={stateToCode(data.estado)} />
            </div>
            <div className="absolute left-8 top-14 rounded-2xl bg-white px-5 py-4 text-[#202b42] shadow-[0_18px_36px_rgba(115,136,171,0.18)]">
              <div className="text-[28px] font-semibold leading-none">{data.cidade} - {stateToCode(data.estado)}</div>
              <div className="mt-1 text-sm text-[#6c7891]">Brasil</div>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-white px-5 py-3 text-[15px] font-medium text-[#2f67f6] shadow-[0_16px_34px_rgba(122,143,177,0.18)]"
            >
              Ver no mapa ampliado
            </a>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.26fr)_minmax(320px,0.66fr)]">
          <div className="rounded-[24px] bg-white p-5 shadow-[0_18px_44px_rgba(124,145,178,0.12)]">
            <h3 className="text-[20px] font-semibold text-[#1b2740]">Previsão para hoje</h3>
            <div className="mt-5 grid grid-cols-2 gap-y-5 sm:grid-cols-4 xl:grid-cols-8">
              {hourly.map((item, index) => (
                <div key={`${item.hora}-${index}`} className="text-center">
                  <div className="text-[15px] text-[#59657f]">{index === 0 ? 'Agora' : item.hora}</div>
                  {item.icone ? <img src={item.icone} alt={item.condicao} className="mx-auto mt-3 h-12 w-12" /> : <CloudSun className="mx-auto mt-3 h-9 w-9 text-[#f6be2f]" />}
                  <div className="mt-2 text-[18px] font-semibold text-[#1d2941]">{item.temperatura}°</div>
                  <div className="mt-1 text-[13px] text-[#6f7b94]">{chanceByCondition(item.condicao)}%</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] bg-white p-5 shadow-[0_18px_44px_rgba(124,145,178,0.12)]">
            <h3 className="text-[20px] font-semibold text-[#1b2740]">Próximos dias</h3>
            <div className="mt-5 space-y-5">
              {nextDays.map((day, index) => (
                <div key={`${day.data}-${index}`} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 text-[15px]">
                  <div className="font-medium text-[#1f2a43]">{resolveDayLabel(index)}</div>
                  <div className="text-[#7a859d]">{day.data}</div>
                  {day.icone ? <img src={day.icone} alt={day.condicao} className="h-9 w-9" /> : <CloudSun className="h-7 w-7 text-[#f6be2f]" />}
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-[#ff4d4f]">{day.maxima}°</span>
                    <span className="font-medium text-[#2f67f6]">{day.minima}°</span>
                    <span className="text-[#6f7b94]">{chanceByCondition(day.condicao)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.26fr)_minmax(320px,0.66fr)]">
          <div className="rounded-[24px] bg-white p-5 shadow-[0_18px_44px_rgba(124,145,178,0.12)]">
            <h3 className="text-[20px] font-semibold text-[#1b2740]">Gráfico de temperatura</h3>
            <div className="mt-4">
              <TemperatureChart hourlyData={data.temperaturasPorHora} />
            </div>
          </div>

          <div className="rounded-[24px] bg-white p-5 shadow-[0_18px_44px_rgba(124,145,178,0.12)]">
            <h3 className="text-[20px] font-semibold text-[#1b2740]">Alertas meteorológicos</h3>
            <div className="mt-5 rounded-[20px] bg-[#fff7e8] p-5">
              <div className="flex items-start gap-3">
                <BellRing className="mt-0.5 h-6 w-6 text-[#f5a623]" />
                <div>
                  <div className="font-semibold text-[#d98300]">{data.alertas.length ? 'Atenção para mudança no clima' : 'Nenhum alerta meteorológico'}</div>
                  <p className="mt-2 text-[15px] leading-6 text-[#6f6250]">
                    {data.alertas.length ? data.alertas.join(' ') : 'No momento não existem alertas ativos para essa localidade. Continue acompanhando as atualizações ao longo do dia.'}
                  </p>
                  <button type="button" className="mt-4 text-[15px] font-medium text-[#2f67f6]">Ver todos os alertas</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function WeatherError({ error }: { error: unknown }) {
  return (
    <div className="rounded-[24px] border border-[#f0d0d0] bg-white p-10 text-center shadow-[0_16px_40px_rgba(134,154,185,0.12)]">
      <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
      <div className="mt-4 text-xl font-semibold text-[#1b2740]">Erro na consulta</div>
      <p className="mx-auto mt-3 max-w-lg text-[15px] text-[#6e7890]">{error instanceof Error ? error.message : 'Não foi possível obter dados meteorológicos.'}</p>
    </div>
  );
}

function WeatherSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.62fr)_minmax(320px,0.72fr)]">
        <Skeleton className="h-[306px] rounded-[26px]" />
        <Skeleton className="h-[306px] rounded-[26px]" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.26fr)_minmax(320px,0.66fr)]">
        <Skeleton className="h-[190px] rounded-[24px]" />
        <Skeleton className="h-[190px] rounded-[24px]" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.26fr)_minmax(320px,0.66fr)]">
        <Skeleton className="h-[320px] rounded-[24px]" />
        <Skeleton className="h-[220px] rounded-[24px]" />
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  suffix,
}: {
  icon: typeof Droplets;
  label: string;
  value: string;
  detail: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/14 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-[14px] text-white/82">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <div className="text-[18px] font-semibold">{value}</div>
        {detail ? <div className="pb-0.5 text-xs text-white/74">{detail}</div> : null}
        {suffix ? <div className="pb-0.5 text-xs text-white/74">{suffix}</div> : null}
      </div>
    </div>
  );
}

function resolveDayLabel(index: number) {
  const labels = ['Sexta-feira', 'Sábado', 'Domingo', 'Segunda-feira', 'Terça-feira'];
  return labels[index] ?? 'Próximo dia';
}

function stateToCode(stateName: string) {
  const entries: Record<string, string> = {
    Acre: 'AC',
    Alagoas: 'AL',
    Amapa: 'AP',
    Amazonas: 'AM',
    Bahia: 'BA',
    Ceara: 'CE',
    'Distrito Federal': 'DF',
    'Espirito Santo': 'ES',
    Goias: 'GO',
    Maranhao: 'MA',
    'Mato Grosso': 'MT',
    'Mato Grosso do Sul': 'MS',
    'Minas Gerais': 'MG',
    Para: 'PA',
    Paraiba: 'PB',
    Parana: 'PR',
    Pernambuco: 'PE',
    Piaui: 'PI',
    'Rio de Janeiro': 'RJ',
    'Rio Grande do Norte': 'RN',
    'Rio Grande do Sul': 'RS',
    Rondonia: 'RO',
    Roraima: 'RR',
    'Santa Catarina': 'SC',
    'Sao Paulo': 'SP',
    Sergipe: 'SE',
    Tocantins: 'TO',
  };
  return entries[stateName] ?? stateName;
}
