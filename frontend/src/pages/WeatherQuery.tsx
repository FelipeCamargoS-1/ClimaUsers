import { useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, BarChart3, CalendarDays, CloudSun, MapPin, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { TemperatureChart } from '../components/weather/TemperatureChart';
import { WeatherCard } from '../components/weather/WeatherCard';
import { Map } from '../components/weather/Map';
import { useBrazilCities, useBrazilStates } from '../hooks/useBrazilLocations';
import { useWeatherQuery } from '../hooks/useWeather';
import type { WeatherData } from '../types';

export function WeatherQuery() {
  const [stateCode, setStateCode] = useState('PR');
  const [city, setCity] = useState('Curitiba');

  const states = useBrazilStates();
  const selectedState = states.data?.find((state) => state.sigla === stateCode);
  const cities = useBrazilCities(selectedState?.id);
  const weather = useWeatherQuery({ city, stateCode, stateName: selectedState?.nome ?? '' });

  return (
    <div className="space-y-5 pb-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Consulta de Clima</h1>
        <p className="mt-1 text-sm text-muted-foreground">Selecione um estado e uma cidade para consultar as condições meteorológicas.</p>
      </header>

      <Card className="shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-[minmax(180px,0.7fr)_minmax(220px,1fr)_auto] md:items-end">
            <SelectField label="Estado do Brasil" value={stateCode} onChange={(value) => { setStateCode(value); setCity(''); }} disabled={states.isLoading}>
              <option value="">Selecione um estado</option>
              {states.data?.map((state) => <option key={state.id} value={state.sigla}>{state.nome} ({state.sigla})</option>)}
            </SelectField>
            <SelectField label="Cidade" value={city} onChange={setCity} disabled={!stateCode || cities.isLoading}>
              <option value="">{cities.isLoading ? 'Carregando cidades...' : 'Selecione uma cidade'}</option>
              {cities.data?.map((item) => <option key={item.id} value={item.nome}>{item.nome}</option>)}
            </SelectField>
            <Button type="button" disabled={!city || !stateCode} className="w-full gap-2 md:w-32" onClick={() => { void weather.refetch(); }}><Search className="h-4 w-4" />Consultar</Button>
          </div>
          {(states.isError || cities.isError) && <p className="mt-3 flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" />Não foi possível carregar as localidades do IBGE. Tente novamente.</p>}
        </CardContent>
      </Card>

      {weather.isLoading ? <WeatherSkeleton /> : weather.isError ? <WeatherError error={weather.error} /> : weather.data ? <WeatherDashboard data={weather.data} /> : null}
    </div>
  );
}

function SelectField({ label, value, onChange, disabled, children }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="h-11 rounded-xl border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60">{children}</select></label>;
}

function WeatherDashboard({ data }: { data: WeatherData }) {
  const hourly = useMemo(() => data.temperaturasPorHora.filter((_, index) => index % 3 === 0).slice(0, 8), [data.temperaturasPorHora]);
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
      <div className="min-w-0 space-y-5">
        <WeatherCard data={data} />
        <Card className="shadow-sm"><CardHeader className="pb-3"><CardTitle className="text-base">Previsão por hora</CardTitle><CardDescription>Temperatura e condição ao longo do dia</CardDescription></CardHeader><CardContent><div className="grid grid-cols-4 gap-2 sm:grid-cols-8">{hourly.map((item, index) => <div key={`${item.hora}-${index}`} className={`rounded-xl p-2 text-center ${index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted/60'}`}><div className="text-[11px] opacity-70">{item.hora}</div>{item.icone ? <img src={item.icone} alt={item.condicao} className="mx-auto h-9 w-9" /> : <CloudSun className="mx-auto my-2 h-5 w-5" />}<div className="text-sm font-bold">{item.temperatura}°</div></div>)}</div></CardContent></Card>
        <Card className="shadow-sm"><CardHeader><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /><div><CardTitle className="text-base">Gráfico de temperatura</CardTitle><CardDescription>Variação da temperatura durante o dia</CardDescription></div></div></CardHeader><CardContent><TemperatureChart hourlyData={data.temperaturasPorHora} /></CardContent></Card>
      </div>

      <aside className="space-y-5">
        <Card className="shadow-sm"><CardHeader className="pb-3"><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><CardTitle className="text-base">Próximos dias</CardTitle></div></CardHeader><CardContent className="space-y-1">{data.previsaoCompleta.map((day, index) => <div key={day.data} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b py-3 last:border-0"><div><div className="text-sm font-semibold">{index === 0 ? 'Hoje' : index === 1 ? 'Amanhã' : day.data}</div><div className="max-w-28 truncate text-xs capitalize text-muted-foreground">{day.condicao}</div></div>{day.icone ? <img src={day.icone} alt={day.condicao} className="h-8 w-8" /> : <CloudSun className="h-5 w-5 text-primary" />}<div className="text-sm"><strong>{day.maxima}°</strong><span className="ml-2 text-muted-foreground">{day.minima}°</span></div></div>)}</CardContent></Card>
        <Card className="overflow-hidden shadow-sm"><CardHeader className="pb-3"><div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /><div><CardTitle className="text-base">Localização</CardTitle><CardDescription>{data.cidade}, {data.estado}</CardDescription>{data.atribuicaoLocalizacao && <a className="text-[10px] text-muted-foreground underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">{data.atribuicaoLocalizacao}</a>}</div></div></CardHeader><CardContent><Map latitude={data.latitude} longitude={data.longitude} city={data.cidade} state={data.estado} /></CardContent></Card>
        <div className={`rounded-2xl border p-4 ${data.alertas.length ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100' : 'bg-muted/40'}`}><div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" /><div><div className="text-sm font-semibold">Alertas meteorológicos</div><p className="mt-1 text-xs opacity-75">{data.alertas.length ? data.alertas.join(' • ') : 'Nenhum alerta meteorológico ativo para esta localidade.'}</p></div></div></div>
      </aside>
    </div>
  );
}

function WeatherError({ error }: { error: unknown }) {
  return <Card><CardContent className="flex flex-col items-center gap-3 p-10 text-center text-destructive"><AlertCircle className="h-10 w-10" /><b>Erro na consulta</b><p className="max-w-lg text-sm">{error instanceof Error ? error.message : 'Não foi possível obter dados meteorológicos.'}</p></CardContent></Card>;
}

function WeatherSkeleton() {
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]"><div className="space-y-5"><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-36 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div><div className="space-y-5"><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div></div>;
}
